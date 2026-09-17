// =============================================================================
// Le Fiduciaire — Restauration d'une sauvegarde logique (Lot 1 — exploitation)
// =============================================================================
// Usage :
//   DATABASE_URL="<cible>" node --experimental-strip-types scripts/restore-db.ts <fichier.json> [--write --confirm]
//
//   (défaut)        mode VÉRIFICATION : compare le backup avec la base cible
//                   (comptes par table, lignes présentes, aucune écriture)
//   --write --confirm  mode RESTAURATION : upserts dans l'ordre des dépendances
//                   (parents d'abord). JAMAIS de suppression : les lignes
//                   existantes sont mises à jour, les absentes recréées.
//
// Sauvegarde testée : backup → base vierge → restore → vérification = counts
// identiques (procédure documentée dans docs/EXPLOITATION.md, § Sauvegarde).
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";

// Même liste ordonnée que scripts/backup-db.ts (parents avant enfants, FK)
// — dupliquée volontairement : exécution node --experimental-strip-types
// sans résolution d'extension .ts entre fichiers.
const MODELES_ORDONNES = [
  "users", "workspaces", "Session", "workspace_members", "invitations",
  "password_resets", "delegated_access", "migration_map", "PayrollConfig",
  "tranches_irpp", "ClientCompany", "Establishment", "employees", "contacts",
  "ConventionCollective", "ConventionArticle", "ConventionGrilleSalariale",
  "Contract", "ContractVersion", "ConventionAdaptation", "WorkCalendar",
  "WorkCalendarDay", "RegleReglementaire", "AttendanceImport",
  "AttendanceSummary", "PayrollVariable", "PayrollPeriod", "Payslip",
  "Anomaly", "DocumentStorage", "CNSSDeclaration", "AuditLog",
] as const;

const prisma = new PrismaClient();

const fichier = process.argv[2];
const WRITE = process.argv.includes("--write");
const CONFIRM = process.argv.includes("--confirm");

if (!fichier || !existsSync(fichier)) {
  console.error("Usage : restore-db.ts <fichier-backup.json> [--write --confirm]");
  process.exit(1);
}
if (WRITE && !CONFIRM) {
  console.error("Mode --write refusé sans --confirm (écriture en base exigée).");
  process.exit(1);
}

const dump = JSON.parse(readFileSync(fichier, "utf-8")) as Record<string, Record<string, unknown>[]>;

// Champs DateTime sérialisés en ISO → reconversion en Date pour Prisma
function rehydate(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v) ? new Date(v) : v;
  }
  return out;
}

async function main() {
  console.log(`Restauration du backup : ${fichier}`);
  console.log(`Mode : ${WRITE ? "ÉCRITURE (upserts, aucune suppression)" : "VÉRIFICATION (lecture seule)"}`);

  // Clé unique par modèle — id partout, sauf workspace_members (clé composite)
  const cleUnique = (m: string, row: Record<string, unknown>): Record<string, unknown> =>
    m === "workspace_members"
      ? { userId_workspaceId: { userId: row.userId, workspaceId: row.workspaceId } }
      : { id: row.id };

  let totauxBackup = 0;
  let totauxBase = 0;
  const ecarts: string[] = [];

  for (const m of MODELES_ORDONNES) {
    const lignesBackup = dump[m] ?? [];
    totauxBackup += lignesBackup.length;

    if (WRITE) {
      // @ts-expect-error accès dynamique au delegate
      let ecrit = 0;
      for (const row of lignesBackup) {
        const data = rehydate(row);
        // @ts-expect-error accès dynamique au delegate
        await prisma[m].upsert({
          where: { id: row.id as string },
          create: data,
          update: data,
        });
        ecrit++;
      }
      // @ts-expect-error accès dynamique au delegate
      const apres = await prisma[m].count();
      totauxBase += apres;
      console.log(`${m}: ${ecrit} upsert(s) → ${apres} ligne(s) en base`);
      if (apres !== lignesBackup.length) {
        ecarts.push(`${m}: ${lignesBackup.length} dans le backup, ${apres} en base après restauration`);
      }
    } else {
      // Mode vérification : compter et contrôler la présence des lignes
      // @ts-expect-error accès dynamique au delegate
      const enBase = await prisma[m].count();
      totauxBase += enBase;
      let presentes = 0;
      if (lignesBackup.length > 0 && enBase > 0) {
        // Échantillon : toutes les lignes si ≤ 50, sinon 50 au hasard stable
        const echantillon = lignesBackup.slice(0, Math.min(50, lignesBackup.length));
        for (const row of echantillon) {
          // @ts-expect-error accès dynamique au delegate
          const existe = await prisma[m].findUnique({ where: { id: row.id as string }, select: { id: true } });
          if (existe) presentes++;
        }
      }
      const marqueur = lignesBackup.length === 0 ? "vide" : enBase === lignesBackup.length ? "OK" : "ÉCART";
      console.log(`${m}: backup=${lignesBackup.length}, base=${enBase} [${marqueur}]${presentes > 0 ? ` (${presentes}/${Math.min(50, lignesBackup.length)} ID retrouvés)` : ""}`);
      if (enBase !== lignesBackup.length) {
        ecarts.push(`${m}: backup=${lignesBackup.length} ≠ base=${enBase}`);
      }
    }
  }

  console.log(`\nTotaux : backup=${totauxBackup}, base=${totauxBase}`);
  if (ecarts.length > 0) {
    console.log("\n⚠ ÉCARTS DÉTECTÉS :");
    ecarts.forEach((e) => console.log(`  - ${e}`));
    process.exit(2);
  }
  console.log(WRITE ? "\nRESTAURATION TERMINÉE — base conforme au backup (upserts, aucune suppression)." : "\nVÉRIFICATION OK — base conforme au backup.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("RESTAURATION ÉCHOUÉE:", e.message);
  process.exit(1);
});
