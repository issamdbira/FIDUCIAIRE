// =============================================================================
// Le Fiduciaire — Custom Vercel Build (Build Output API v3)
// =============================================================================
// Produces .vercel/output/ with:
//   - static/  → Vite frontend build
//   - functions/api/[[...path]].func/ → Express API bundled with esbuild
//   - config.json → routes (API → serverless, SPA → index.html)
// =============================================================================

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.resolve(ROOT, ".vercel", "output");
const FUNC_DIR = path.resolve(OUTPUT, "functions", "api", "[[...path]].func");

// Step 1: Build Vite frontend
console.log("🔨 Step 1: Building Vite frontend...");
execSync("npx vite build", { cwd: ROOT, stdio: "inherit" });

// Step 2: Create .vercel/output structure
console.log("📁 Step 2: Creating .vercel/output structure...");
if (fs.existsSync(OUTPUT)) fs.rmSync(OUTPUT, { recursive: true });
fs.mkdirSync(path.resolve(OUTPUT, "static"), { recursive: true });
fs.mkdirSync(FUNC_DIR, { recursive: true });

// Step 3: Copy Vite build output to static/
console.log("📦 Step 3: Copying static files...");
const distPublic = path.resolve(ROOT, "dist", "public");
copyDirRecursive(distPublic, path.resolve(OUTPUT, "static"));

// Step 4: Bundle server with esbuild into the serverless function
console.log("⚡ Step 4: Bundling API serverless function...");

// Create a temporary entry file with dynamic import for full error capture.
// Dynamic import defers ALL module loading to the first request,
// so any module-load-time error is caught and returned as JSON.
const tempEntry = path.resolve(ROOT, ".vercel-temp-entry.mjs");
fs.writeFileSync(tempEntry, `
let app = null;
let initError = null;
let initPromise = null;

async function ensureApp() {
  if (app) return app;
  if (initError) throw initError;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { createApp } = await import("./server/index.ts");
      app = createApp();
      return app;
    } catch (err) {
      initError = err;
      console.error("❌ Module load or createApp() failed:", err?.message || err, err?.stack?.slice(0, 500));
      throw err;
    }
  })();
  return initPromise;
}

export default async function handler(req, res) {
  try {
    const application = await ensureApp();
    application(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
    }
    res.end(JSON.stringify({
      error: "Initialization failed",
      message: err?.message || String(err),
      stack: err?.stack?.split("\\n").slice(0, 15),
      code: err?.code
    }));
  }
}
`);

try {
  execSync(
    `npx esbuild ${tempEntry} ` +
    `--bundle --platform=node --target=node22 ` +
    `--format=esm ` +
    `--resolve-extensions=.ts,.tsx,.js,.jsx,.mjs,.json ` +
    `--outfile=${path.resolve(FUNC_DIR, "index.mjs")} ` +
    `--allow-overwrite`,
    { cwd: ROOT, stdio: "inherit" }
  );
} catch (err) {
  // CRITICAL: Fail LOUDLY. A deployment that "succeeds" with an empty API
  // is more dangerous than a visible failure.
  console.error("❌ FATAL: esbuild bundling failed!");
  console.error("   The API serverless function could NOT be built.");
  console.error("   Aborting build — Vercel will NOT deploy a broken API.");
  console.error("   Original error:", err?.message || err);
  // Clean up temp file before exiting
  try { fs.unlinkSync(tempEntry); } catch {}
  process.exit(1);
}

// Clean up temp entry
fs.unlinkSync(tempEntry);

// Write function config
fs.writeFileSync(
  path.resolve(FUNC_DIR, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "nodejs",
    shouldAddHelpers: true,
  }, null, 2) + "\n"
);

// Step 5: Write the output config
console.log("⚙️ Step 5: Writing config.json...");
// CRITICAL: dest MUST match the function directory name (without .func suffix).
// The function is at functions/api/[[...path]].func/
// So dest must be "/api/[[...path]]" for Vercel to route to it.
// The SPA fallback must EXCLUDE /api/* to avoid capturing API requests.
fs.writeFileSync(
  path.resolve(OUTPUT, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/api/(.*)", dest: "/api/[[...path]]" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }, null, 2) + "\n"
);

console.log("✅ Build complete! .vercel/output/ is ready for deployment.");

// --- Helper ---
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ Source directory not found: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
