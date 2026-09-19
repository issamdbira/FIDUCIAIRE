// start-pglite.mjs — Exposes a PGlite instance over the Postgres wire protocol
// via pglite-server so Prisma can connect to it as a real DB.

import { PGlite } from "@electric-sql/pglite";
import { createServer, LogLevel } from "pglite-server";
import { mkdirSync } from "node:fs";

const PORT = Number(process.env.PORT || 5433);
const DATA_DIR = process.env.DATA_DIR || "/home/z/my-project/db/pglite-fiduciaire";

mkdirSync(DATA_DIR, { recursive: true });

console.log(`[pglite] Booting PGlite at ${DATA_DIR} ...`);
const db = new PGlite(DATA_DIR);
await db.waitReady;

console.log("[pglite] PGlite ready. Creating db server on port " + PORT);
const pgServer = createServer(db, { logLevel: LogLevel.Error });

pgServer.listen(PORT, "127.0.0.1", () => {
  console.log(`[pglite] Listening on 127.0.0.1:${PORT}`);
  console.log(`[pglite] DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
