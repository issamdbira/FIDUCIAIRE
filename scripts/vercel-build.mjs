// =============================================================================
// Le Fiduciaire — Custom Vercel Build (Build Output API v3)
// =============================================================================
// This script produces a .vercel/output/ directory that Vercel deploys directly.
// It bypasses Vercel's framework auto-detection (which incorrectly detects Next.js).
// =============================================================================

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.resolve(ROOT, ".vercel", "output");

// Step 1: Build Vite frontend
console.log("🔨 Step 1: Building Vite frontend...");
execSync("npx vite build", { cwd: ROOT, stdio: "inherit" });

// Step 2: Create .vercel/output structure
console.log("📁 Step 2: Creating .vercel/output structure...");

// Clean previous output
if (fs.existsSync(OUTPUT)) fs.rmSync(OUTPUT, { recursive: true });

fs.mkdirSync(path.resolve(OUTPUT, "static"), { recursive: true });
fs.mkdirSync(path.resolve(OUTPUT, "functions", "api", "[[...path]].func"), { recursive: true });

// Step 3: Copy Vite build output to static/
console.log("📦 Step 3: Copying static files...");
const distPublic = path.resolve(ROOT, "dist", "public");
copyDirRecursive(distPublic, path.resolve(OUTPUT, "static"));

// Step 4: Write the serverless function
console.log("⚡ Step 4: Writing serverless function...");

// The function handler — inline to avoid import resolution issues
const functionCode = `
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

export default function handler(req, res) {
  app(req, res);
}
`;

fs.writeFileSync(
  path.resolve(OUTPUT, "functions", "api", "[[...path]].func", "index.js"),
  functionCode.trim() + "\n"
);

// Write function config
fs.writeFileSync(
  path.resolve(OUTPUT, "functions", "api", "[[...path]].func", ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs24.x",
    handler: "index.js",
    launcherType: "nodejs",
    shouldAddHelpers: false,
  }, null, 2) + "\n"
);

// Step 5: Write the output config
console.log("⚙️ Step 5: Writing config.json...");
fs.writeFileSync(
  path.resolve(OUTPUT, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/api/(.*)", dest: "/api/$1" },
      { src: "^/(?!.*\\\\.).*$", dest: "/index.html" },
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
