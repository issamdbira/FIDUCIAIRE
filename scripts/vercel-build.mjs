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
import { fileURLToPath as _fu } from "url";
import { dirname as _dn, join as _pj } from "path";

// Tell Prisma where to find the query engine binary in the Lambda environment
const __fnDir = _dn(_fu(import.meta.url));
process.env.PRISMA_QUERY_ENGINE_LIBRARY = _pj(__fnDir, "libquery_engine-rhel-openssl-3.A.x.so.node").replace("3.A.x", "3.0.x");

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
    `--external:path --external:fs --external:crypto --external:http --external:https ` +
    `--external:stream --external:util --external:url --external:os --external:net ` +
    `--external:dns --external:querystring --external:zlib --external:events ` +
    `--external:buffer --external:child_process --external:tls --external:assert ` +
    `--external:process --external:string_decoder --external:readline ` +
    `--allow-overwrite`,
    { cwd: ROOT, stdio: "inherit" }
  );

  // Inject CJS require polyfill at the top of the bundle.
  // Fixes: "Dynamic require of 'path' is not supported"
  //   and "__dirname is not defined" (used by Prisma CJS runtime)
  // Express/depd/body-parser use dynamic require() for Node.js builtins.
  // createRequire makes require() available in ESM context.
  // __dirname/__filename are needed by Prisma's CJS runtime.
  const outFile = path.resolve(FUNC_DIR, "index.mjs");
  const bundleCode = fs.readFileSync(outFile, "utf8");
  // NOTE: Do NOT re-import fileURLToPath or path here — they are already
  // imported in the temp entry file (as _fu, _dn, _pj) and bundled by esbuild.
  // Re-declaring them causes: SyntaxError: Identifier '_fu' has already been declared
  const requirePolyfill = [
    `import{createRequire as _cr}from"module";`,
    `const require=_cr(import.meta.url);`,
    `const __filename=_fu(import.meta.url);`,
    `const __dirname=_dn(__filename);`,
    `\n`,
  ].join("");
  fs.writeFileSync(outFile, requirePolyfill + bundleCode);
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

// Step 5: Copy Prisma query engine for Vercel runtime (rhel-openssl-3.0.x)
console.log("🔌 Step 5: Copying Prisma query engine for Vercel...");
const prismaClientDir = findPrismaClientDir(ROOT);
if (prismaClientDir) {
  // Vercel Lambda runs on Amazon Linux 2023 → rhel-openssl-3.0.x
  const rhelEngine = path.resolve(prismaClientDir, "libquery_engine-rhel-openssl-3.0.x.so.node");
  if (fs.existsSync(rhelEngine)) {
    // Copy to function root where Prisma looks for it
    fs.copyFileSync(rhelEngine, path.resolve(FUNC_DIR, "libquery_engine-rhel-openssl-3.0.x.so.node"));
    const sizeMB = (fs.statSync(rhelEngine).size / 1024 / 1024).toFixed(1);
    console.log(`   ✅ Copied rhel engine binary (${sizeMB}MB) to function directory`);

    // Also create the .prisma/client directory structure that Prisma expects
    const prismaDir = path.resolve(FUNC_DIR, "node_modules", ".prisma", "client");
    fs.mkdirSync(prismaDir, { recursive: true });
    fs.copyFileSync(rhelEngine, path.resolve(prismaDir, "libquery_engine-rhel-openssl-3.0.x.so.node"));

    // Copy schema.prisma too (needed by the engine)
    const schemaFile = path.resolve(prismaClientDir, "schema.prisma");
    if (fs.existsSync(schemaFile)) {
      fs.copyFileSync(schemaFile, path.resolve(prismaDir, "schema.prisma"));
    }
  } else {
    console.error("   ⚠️  rhel-openssl-3.0.x engine binary NOT found!");
    console.error("   Make sure prisma/schema.prisma has binaryTargets = ['native', 'rhel-openssl-3.0.x']");
    process.exit(1);
  }
} else {
  console.error("   ⚠️  .prisma/client directory not found!");
  process.exit(1);
}

// Step 6: Write the output config
console.log("⚙️ Step 6: Writing config.json...");
// CRITICAL: dest MUST match the function directory name (without .func suffix).
// The function is at functions/api/[[...path]].func/
// So dest must be "/api/[[...path]]" for Vercel to route to it.
// The SPA fallback must EXCLUDE /api/* to avoid capturing API requests.
//
// Lot 2 — en-têtes de sécurité sur TOUTES les réponses (statique + SPA) :
//   - 1re route : dest "/$1" (chemin inchangé) + en-têtes → s'applique aux
//     assets servis par le handle filesystem ET traverse vers /api ;
//   - la même CSP que server/lib/security-headers.ts (source commune :
//     VITE_ANALYTICS_ENDPOINT, lue au build comme au runtime).
const analyticsUrl = (process.env.VITE_ANALYTICS_ENDPOINT || "")
  .trim()
  .replace(/\/+$/, "");
const analytics = /^https:\/\/[\w.-]+$/.test(analyticsUrl) ? analyticsUrl : null;
const scriptSrc = `'self'${analytics ? ` ${analytics}` : ""}`;
const connectSrc = `'self'${analytics ? ` ${analytics}` : ""}`;
const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const EN_TETES = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
fs.writeFileSync(
  path.resolve(OUTPUT, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "/(.*)", dest: "/$1", headers: EN_TETES },
      { handle: "filesystem" },
      { src: "/api/(.*)", dest: "/api/[[...path]]" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }, null, 2) + "\n"
);

console.log("✅ Build complete! .vercel/output/ is ready for deployment.");

// --- Helper ---
function findPrismaClientDir(root) {
  // Look for .prisma/client in pnpm node_modules structure
  const pnpmDir = path.resolve(root, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (entry.startsWith("@prisma+client@")) {
        const clientDir = path.resolve(pnpmDir, entry, "node_modules", ".prisma", "client");
        if (fs.existsSync(clientDir)) return clientDir;
      }
    }
  }
  // Fallback: flat node_modules
  const flatDir = path.resolve(root, "node_modules", ".prisma", "client");
  if (fs.existsSync(flatDir)) return flatDir;
  return null;
}

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
