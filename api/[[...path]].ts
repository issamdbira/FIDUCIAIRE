// =============================================================================
// Le Fiduciaire — Vercel Serverless Function (catch-all route)
// =============================================================================
//
// Ce fichier est le point d'entrée serverless pour TOUTES les requêtes /api/*.
// Vercel route automatiquement /api/auth/login, /api/health, etc. vers ce fichier
// grâce au pattern [[...path]].
//
// La fonction importe l'Express app, laisse Express router la requête,
// et retourne la réponse au runtime Vercel.
// =============================================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/index.js";

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  app(req, res);
}
