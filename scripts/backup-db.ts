// =============================================================================
// Le Fiduciaire — Sauvegarde logique complète (Lot 1 — exploitation)
// =============================================================================
// Usage :
//   DATABASE_URL="postgresql://…" node --experimental-strip-types scripts/backup-db.ts
//
// Sauvegarde TOUTES les tables métier dans un JSON horodaté (auditabilité,
// restauration testable via scripts/restore-db.ts). Aucun secret n'est lu
// autrement que l'environnement ; aucune donnée n'est envoyée hors du poste.
//
// Procédure complète : voir docs/EXPLOITATION.md (§ Sauvegarde / Restauration).
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";

const prisma = new PrismaClient();

// Ordre = ordre de RESTAURATION (parents avant enfants, contraintes FK)
export const MODELES_ORDONNES = [
  "users",
  "workspaces",
  "Session",
  "workspace_members",
  "invitations",
  "password_resets",
  "delegated_access",
  "migration_map",
  "PayrollConfig",
  "tranches_irpp",
  "ClientCompany",
  "Establishment",
  "employees",
  "contacts",
  "ConventionCollective",
  "ConventionArticle",
  "ConventionGrilleSalariale",
  "Contract",
  "ContractVersion",
  "ConventionAdaptation",
  "WorkCalendar",
  "WorkCalendarDay",
  "RegleReglementaire",
  "AttendanceImport",
  "AttendanceSummary",
  "PayrollVariable",
  "PayrollPeriod",
  "Payslip",
  "Anomaly",
  "DocumentStorage",
  "CNSSDeclaration",
  "AuditLog",
] as const;

async function main() {
  const dump: Record<string, unknown[]> = {};
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = process.env.BACKUP_DIR || "backups";
  mkdirSync(outDir, { recursive: true });

  for (const m of MODELES_ORDONNES) {
    // @ts-expect-error accès dynamique au delegate
    const rows = await prisma[m].findMany();
    dump[m] = rows;
    console.log(`${m}: ${rows.length} ligne(s)`);
  }

  const out = `${outDir}/backup-fiduciaire-${stamp}.json`;
  writeFileSync(out, JSON.stringify(dump));
  const total = Object.values(dump).reduce((s, r) => s + r.length, 0);
  console.log(`\nBACKUP OK → ${out}`);
  console.log(`Total: ${total} lignes sur ${MODELES_ORDONNES.length} tables`);
  console.log(`Fichier: ${(JSON.stringify(dump).length / 1024).toFixed(1)} Ko`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("BACKUP ÉCHOUÉ:", e.message);
  process.exit(1);
});
