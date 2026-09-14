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

// Create a temporary entry file that imports createApp and exports the handler
// IMPORTANT: import from .ts — esbuild bundles TypeScript natively.
// Use LAZY initialization: createApp() is called on the first request,
// not at module load time. This prevents module-load-time errors from
// causing FUNCTION_INVOCATION_FAILED, and lets us return the actual error.
const tempEntry = path.resolve(ROOT, ".vercel-temp-entry.mjs");
fs.writeFileSync(tempEntry, `
import { createApp } from "./server/index.ts";

let app = null;
let initError = null;

function getApp() {
  if (app) return app;
  if (initError) return null;
  try {
    app = createApp();
    return app;
  } catch (err) {
    initError = err;
    console.error("❌ createApp() failed:", err?.message || err);
    return null;
  }
}

export default function handler(req, res) {
  const application = getApp();
  if (!application) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      error: "App initialization failed",
      message: initError?.message || "Unknown error",
      stack: initError?.stack?.split("\\n").slice(0, 10)
    }));
    return;
  }
  application(req, res);
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
