// client/src/lib/conventions/data/index.ts — re-export depuis shared/conventions/data
// (Lot 8 suite — les données de convention sont désormais partagées client/serveur)
// Utilise l'alias @shared configuré dans tsconfig.json et vite.config.ts
export {
  CONVENTIONS,
  getConventionBySlug,
  getConventionById,
  SMIG_SMAG,
  getSmig,
  getLatestSmigYear,
} from "@shared/conventions/data/index";
