// =============================================================================
// Le Fiduciaire — Vercel Serverless Function Entry Point
// =============================================================================
//
// Ce fichier est le point d'entrée pour les fonctions serverless Vercel.
// Il importe l'Express app depuis server/index.ts et la convertit en handler
// compatible avec le runtime Vercel (@vercel/node).
//
// Toute requête /api/* est routée vers cette fonction, qui la délègue à Express.
// =============================================================================

import { createApp } from "../server/index.js";

const app = createApp();

export default app;
