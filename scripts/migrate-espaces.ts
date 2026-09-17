// =============================================================================
// Le Fiduciaire — Migration des espaces (Phase 10 — modèle métier)
// =============================================================================
// Deux opérations, exécutables en 3 modes : --dry-run (défaut, lecture seule),
// --run (exécution), --reverse (annulation de la migration espaces).
//
//   node scripts/migrate-espaces.ts fusion --source <wsId> --target <wsId> [--run]
//   node scripts/migrate-espaces.ts espaces --cabinet <wsId> [--run]
//   node scripts/migrate-espaces.ts espaces --reverse
//
// PRÉREQUIS ABSOLUS avant --run :
//   1. pg_dump complet de la base (backup)
//   2. Migrations Prisma appliquées (phase 7 invitations + phase 10 espaces)
//   3. Exécuter d'abord --dry-run et FAIRE VALIDER le rapport
//
// RÈGLES (document d'orientation — fait autorité) :
//   - Aucune donnée supprimée ; aucun ID modifié ; tout est ADDITIF
//   - Chaque client = transaction isolée (échec sans effet partiel)
//   - migration_map rend le script idempotent (re-run = skip)
//   --reverse restaure l'état d'origine (valide tant qu'aucune activité
//   nouvelle n'a eu lieu dans les espaces créés)
// =============================================================================

import { PrismaClient } from "@prisma/client";

const mode = process.argv[2]; // fusion | espaces
const flags = process.argv.slice(3);
const RUN = flags.includes("--run"); // sinon dry-run
const arg = (name: string): string | undefined => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : undefined;
};
const REVERSE = flags.includes("--reverse");

const prisma = new PrismaClient();

function log(mode_: "DRY" | "RUN", msg: string) {
  console.log(`[${mode_}] ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPÉRATION 1 : FUSION de deux cabinets (décision utilisateur n° 2)
// Déplace TOUT le contenu du cabinet source vers le cabinet cible, puis
// archive le source (masqué du sélecteur, données conservées).
// ─────────────────────────────────────────────────────────────────────────────
async function fusion(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error("source et target identiques");
  const source = await prisma.workspaces.findUnique({ where: { id: sourceId } });
  const target = await prisma.workspaces.findUnique({ where: { id: targetId } });
  if (!source) throw new Error(`workspace source ${sourceId} introuvable`);
  if (!target) throw new Error(`workspace cible ${targetId} introuvable`);
  if (source.archivedAt) throw new Error("le cabinet source est déjà archivé");

  // Inventaire
  const clients = await prisma.clientCompany.findMany({ where: { workspaceId: sourceId }, select: { id: true, raisonSociale: true } });
  const employees = await prisma.employees.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const contracts = await prisma.contract.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const periods = await prisma.payrollPeriod.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const cnss = await prisma.cNSSDeclaration.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const attendance = await prisma.attendanceImport.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const documents = await prisma.documentStorage.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const conventions = await prisma.conventionCollective.findMany({ where: { workspaceId: sourceId }, select: { id: true, code: true } });
  const regles = await prisma.regleReglementaire.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const contacts = await prisma.contacts.findMany({ where: { workspaceId: sourceId }, select: { id: true } });
  const members = await prisma.workspace_members.findMany({ where: { workspaceId: sourceId } });
  const audits = await prisma.auditLog.findMany({ where: { workspaceId: sourceId }, select: { id: true } });

  log(RUN ? "RUN" : "DRY", `Fusion « ${source.name} » → « ${target.name} » :`);
  console.log(`  clients: ${clients.length}, employés: ${employees.length}, contrats: ${contracts.length}, périodes: ${periods.length}, CNSS: ${cnss.length}`);
  console.log(`  pointages: ${attendance.length}, documents: ${documents.length}, conventions: ${conventions.length}, règles: ${regles.length}`);
  console.log(`  contacts: ${contacts.length}, membres: ${members.length}, audit: ${audits.length}`);
  clients.forEach((c) => console.log(`    - client déplacé : ${c.raisonSociale}`));
  members.forEach((m) => console.log(`    - membre : ${m.userId} (${m.role})`));

  if (!RUN) {
    log("DRY", "Dry-run — rien n'a été modifié. Relancez avec --run pour exécuter.");
    return;
  }

  const RANG_ROLE: Record<string, number> = { PROPRIETAIRE: 3, GESTIONNAIRE: 2, LECTEUR: 1 };

  await prisma.$transaction(async (tx) => {
    // 1. Membres : fusionner (rôle le plus élevé conservé)
    for (const m of members) {
      const existant = await tx.workspace_members.findUnique({
        where: { userId_workspaceId: { userId: m.userId, workspaceId: targetId } },
      });
      if (!existant) {
        await tx.workspace_members.create({ data: { userId: m.userId, workspaceId: targetId, role: m.role } });
      } else if ((RANG_ROLE[m.role] ?? 0) > (RANG_ROLE[existant.role] ?? 0)) {
        await tx.workspace_members.update({
          where: { userId_workspaceId: { userId: m.userId, workspaceId: targetId } },
          data: { role: m.role },
        });
      }
    }

    // 2. Conventions : déplacer, sauf code déjà présent en cible (re-pointer alors)
    for (const conv of conventions) {
      const clone = await tx.conventionCollective.findFirst({ where: { workspaceId: targetId, code: conv.code } });
      if (clone) {
        await tx.conventionAdaptation.updateMany({ where: { conventionCollectiveId: conv.id }, data: { conventionCollectiveId: clone.id, workspaceId: targetId } });
        await tx.contract.updateMany({ where: { conventionCollectiveId: conv.id }, data: { workspaceId: targetId } });
        // La convention source reste attachée au workspace archivé (aucune suppression)
      } else {
        await tx.conventionCollective.update({ where: { id: conv.id }, data: { workspaceId: targetId } });
      }
    }

    // 3. Re-parentage global vers la cible
    await tx.clientCompany.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.employees.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.contract.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.payrollPeriod.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.cNSSDeclaration.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.attendanceImport.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.attendanceSummary.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.payrollVariable.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.documentStorage.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.workCalendar.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.conventionAdaptation.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.regleReglementaire.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.contacts.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.invitations.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });
    await tx.auditLog.updateMany({ where: { workspaceId: sourceId }, data: { workspaceId: targetId } });

    // 4. Délégations éventuelles pointant vers le source
    await tx.delegated_access.updateMany({
      where: { cabinetWorkspaceId: sourceId },
      data: { cabinetWorkspaceId: targetId },
    });

    // 5. Archiver le cabinet source (masqué, JAMAIS supprimé)
    await tx.workspaces.update({
      where: { id: sourceId },
      data: { archivedAt: new Date(), name: `${source.name} (fusionné)` },
    });

    // 6. Trace d'audit dans la cible
    await tx.auditLog.create({
      data: {
        workspaceId: targetId,
        userId: "system-migration",
        action: "CABINET_FUSION",
        entity: "workspaces",
        entityId: sourceId,
        details: JSON.stringify({ fusionne: source.name, sourceId, clientsDeplaces: clients.length }),
      },
    });
  }, { timeout: 60_000, maxWait: 10_000 });

  log("RUN", "Fusion exécutée — le cabinet source est archivé (masqué), aucune donnée supprimée.");
}

// ─────────────────────────────────────────────────────────────────────────────
// OPÉRATION 2 : MIGRATION ESPACES — chaque ClientCompany d'un cabinet obtient
// son espace ENTREPRISE autonome + délégation ACTIVE (plan validé §6)
// ─────────────────────────────────────────────────────────────────────────────
async function migrerEspaces(cabinetId: string) {
  const cabinet = await prisma.workspaces.findUnique({ where: { id: cabinetId } });
  if (!cabinet) throw new Error(`cabinet ${cabinetId} introuvable`);
  if (cabinet.type !== "CABINET") throw new Error(`${cabinet.name} n'est pas un espace CABINET`);

  const clients = await prisma.clientCompany.findMany({ where: { workspaceId: cabinetId } });

  // Déjà migrés ?
  const maps = await prisma.migration_map.findMany({ where: { oldWorkspaceId: cabinetId } });
  const dejaMigres = new Set(maps.filter((m) => m.status === "EXECUTED").map((m) => m.clientCompanyId));

  log(RUN ? "RUN" : "DRY", `Migration des espaces — cabinet « ${cabinet.name} » : ${clients.length} client(s)`);

  for (const client of clients) {
    if (dejaMigres.has(client.id)) {
      console.log(`  [SKIP] ${client.raisonSociale} — déjà migré (migration_map)`);
      continue;
    }

    // Inventaire des données à déplacer
    const employees = await prisma.employees.findMany({ where: { clientCompanyId: client.id }, select: { id: true } });
    const employeeIds = employees.map((e) => e.id);
    const contracts = await prisma.contract.count({ where: { employeeId: { in: employeeIds } } });
    const periods = await prisma.payrollPeriod.findMany({ where: { clientCompanyId: client.id }, select: { id: true } });
    const periodIds = periods.map((p) => p.id);
    const cnss = await prisma.cNSSDeclaration.count({ where: { clientCompanyId: client.id } });
    const attendance = await prisma.attendanceImport.count({ where: { clientCompanyId: client.id } });
    const documents = await prisma.documentStorage.count({
      where: { OR: [{ clientCompanyId: client.id }, { periodePaieId: { in: periodIds } }] },
    });
    const adaptations = await prisma.conventionAdaptation.findMany({ where: { clientCompanyId: client.id } });

    console.log(`  [${RUN ? "RUN" : "DRY"}] ${client.raisonSociale} : ${employees.length} salarié(s), ${contracts} contrat(s), ${periods.length} période(s), ${cnss} décl. CNSS, ${attendance} pointage(s), ${documents} document(s), ${adaptations.length} adaptation(s) convention`);

    if (!RUN) continue;

    // Config paie du cabinet (à copier), sinon défauts
    const configCabinet = await prisma.payrollConfig.findUnique({ where: { workspaceId: cabinetId } });

    await prisma.$transaction(async (tx) => {
      // 1. Espace ENTREPRISE (champs employeur copiés du client + du cabinet)
      const espace = await tx.workspaces.create({
        data: {
          name: client.raisonSociale,
          type: "ENTREPRISE",
          matriculeCnss: client.matriculeCnss ?? cabinet.matriculeCnss,
          matriculeFiscal: client.matriculeFiscal ?? cabinet.matriculeFiscal,
          address: client.adresse ?? cabinet.address,
          secteur: client.secteur?.toString().toLowerCase() ?? cabinet.secteur,
          tauxAtMp: cabinet.tauxAtMp,
        },
      });

      // 2. Config paie (copie du cabinet) + tranches IRPP
      if (configCabinet) {
        const { id: _i, workspaceId: _w, createdAt: _c, updatedAt: _u, ...champs } = configCabinet;
        const config = await tx.payrollConfig.create({
          data: { workspaceId: espace.id, ...(champs as unknown as Record<string, never>) },
        });
        const tranches = await tx.tranches_irpp.findMany({
          where: { payrollConfigId: configCabinet.id },
          orderBy: { ordre: "asc" },
        });
        if (tranches.length > 0) {
          await tx.tranches_irpp.createMany({
            data: tranches.map((t) => ({
              payrollConfigId: config.id,
              min: t.min, max: t.max, taux: t.taux, ordre: t.ordre,
            })),
          });
        }
      }

      // 3. Conventions du cabinet → copies dans le nouvel espace ; les
      //    adaptations du client re-pointent vers les copies
      const conventions = await tx.conventionCollective.findMany({ where: { workspaceId: cabinetId } });
      const mapConventions = new Map<string, string>();
      for (const conv of conventions) {
        const { id: _cid, workspaceId: _cws, ...champsConv } = conv;
        const copie = await tx.conventionCollective.create({
          data: { workspaceId: espace.id, ...(champsConv as unknown as Record<string, never>) },
        });
        mapConventions.set(conv.id, copie.id);
      }
      for (const ada of adaptations) {
        const nouvelleConv = mapConventions.get(ada.conventionCollectiveId) ?? ada.conventionCollectiveId;
        await tx.conventionAdaptation.update({
          where: { id: ada.id },
          data: { workspaceId: espace.id, conventionCollectiveId: nouvelleConv },
        });
      }

      // 4. Règles réglementaires : copie (référentiel partagé à l'instant T)
      const regles = await tx.regleReglementaire.findMany({ where: { workspaceId: cabinetId } });
      for (const r of regles) {
        const { id: _rid, workspaceId: _rw, ...champsRegle } = r;
        await tx.regleReglementaire.create({
          data: { workspaceId: espace.id, ...(champsRegle as unknown as Record<string, never>) },
        });
      }

      // 5. Re-parentage (UPDATE workspaceId — AUCUN ID modifié)
      await tx.clientCompany.update({ where: { id: client.id }, data: { workspaceId: espace.id } });
      await tx.employees.updateMany({ where: { clientCompanyId: client.id }, data: { workspaceId: espace.id } });
      await tx.contract.updateMany({ where: { employeeId: { in: employeeIds } }, data: { workspaceId: espace.id } });
      await tx.payrollPeriod.updateMany({ where: { clientCompanyId: client.id }, data: { workspaceId: espace.id } });
      await tx.cNSSDeclaration.updateMany({ where: { clientCompanyId: client.id }, data: { workspaceId: espace.id } });
      await tx.attendanceImport.updateMany({ where: { clientCompanyId: client.id }, data: { workspaceId: espace.id } });
      await tx.attendanceSummary.updateMany({ where: { workspaceId: cabinetId, employeeId: { in: employeeIds } }, data: { workspaceId: espace.id } });
      await tx.payrollVariable.updateMany({ where: { workspaceId: cabinetId, employeeId: { in: employeeIds } }, data: { workspaceId: espace.id } });
      await tx.documentStorage.updateMany({
        where: { OR: [{ clientCompanyId: client.id }, { periodePaieId: { in: periodIds } }] },
        data: { workspaceId: espace.id },
      });
      await tx.workCalendar.updateMany({ where: { clientCompanyId: client.id }, data: { workspaceId: espace.id } });

      // NB : payslips, anomalies, versions de contrats suivent periodId/employeeId
      // (aucun workspaceId direct) — RIEN à modifier, aucun ID changé.

      // 6. Délégation ACTIVE cabinet → nouvel espace
      await tx.delegated_access.create({
        data: {
          cabinetWorkspaceId: cabinetId,
          targetWorkspaceId: espace.id,
          statut: "ACTIVE",
          createdByUserId: "system-migration",
        },
      });

      // 7. Traces d'audit : l'historique RESTE dans le cabinet (décision n° 4),
      //    entrée synthétique dans le nouvel espace
      await tx.auditLog.create({
        data: {
          workspaceId: espace.id,
          userId: "system-migration",
          action: "SPACE_MIGRATED",
          entity: "workspaces",
          entityId: espace.id,
          details: JSON.stringify({
           origine: cabinet.name, ancienWorkspaceId: cabinetId,
            salariees: employees.length, periodes: periods.length,
          }),
        },
      });

      // 8. Idempotence
      await tx.migration_map.create({
        data: {
          oldWorkspaceId: cabinetId,
          clientCompanyId: client.id,
          newWorkspaceId: espace.id,
          status: "EXECUTED",
        },
      });
    }, { timeout: 60_000, maxWait: 10_000 });
  }

  if (!RUN) {
    log("DRY", "Dry-run — rien n'a été modifié. Relancez avec --run pour exécuter.");
  } else {
    // Rapport post-migration : salariés éventuellement restés sans client
    const orphelins = await prisma.employees.count({ where: { workspaceId: cabinetId, clientCompanyId: null } });
    if (orphelins > 0) {
      console.log(`\n⚠️  ${orphelins} salarié(s) sans entreprise sont restés dans le cabinet — rattachez-les depuis Gestion des employés.`);
    }
    log("RUN", "Migration terminée.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPÉRATION 2b : REVERSE — annule la migration espaces (réversibilité)
// ─────────────────────────────────────────────────────────────────────────────
async function reverseEspaces() {
  const maps = await prisma.migration_map.findMany({ where: { status: "EXECUTED" } });
  log(RUN ? "RUN" : "DRY", `Reverse : ${maps.length} migration(s) à annuler`);

  for (const m of maps) {
    const client = await prisma.clientCompany.findUnique({ where: { id: m.clientCompanyId } });
    const espace = await prisma.workspaces.findUnique({ where: { id: m.newWorkspaceId } });
    console.log(`  [${RUN ? "RUN" : "DRY"}] ${client?.raisonSociale ?? m.clientCompanyId} : ${espace?.name ?? m.newWorkspaceId} → ${m.oldWorkspaceId}`);
    if (!RUN) continue;

    // GARDE-FOU : refuser d'annuler si une activité NOUVELLE a eu lieu dans
    // l'espace créé après la migration (sinon la suppression casserait des
    // données réelles — fusion manuelle nécessaire dans ce cas)
    const activiteNouvelle =
      (await prisma.employees.count({ where: { workspaceId: m.newWorkspaceId, createdAt: { gt: m.executedAt } } })) +
      (await prisma.payrollPeriod.count({ where: { workspaceId: m.newWorkspaceId, createdAt: { gt: m.executedAt } } })) +
      (await prisma.workspace_members.count({ where: { workspaceId: m.newWorkspaceId } }));
    if (activiteNouvelle > 0) {
      console.log(`    ⚠️  IGNORÉ — ${activiteNouvelle} élément(s) créé(s) dans l'espace après la migration (salariés, périodes ou membres). Annulation manuelle requise.`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const employees = await tx.employees.findMany({ where: { clientCompanyId: m.clientCompanyId }, select: { id: true } });
      const employeeIds = employees.map((e) => e.id);
      const periods = await tx.payrollPeriod.findMany({ where: { clientCompanyId: m.clientCompanyId }, select: { id: true } });
      const periodIds = periods.map((p) => p.id);

      // Re-parentage retour
      await tx.clientCompany.update({ where: { id: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.employees.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.contract.updateMany({ where: { employeeId: { in: employeeIds } }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.payrollPeriod.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.cNSSDeclaration.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.attendanceImport.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.attendanceSummary.updateMany({ where: { workspaceId: m.newWorkspaceId, employeeId: { in: employeeIds } }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.payrollVariable.updateMany({ where: { workspaceId: m.newWorkspaceId, employeeId: { in: employeeIds } }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.documentStorage.updateMany({
        where: { OR: [{ clientCompanyId: m.clientCompanyId }, { periodePaieId: { in: periodIds } }] },
        data: { workspaceId: m.oldWorkspaceId },
      });
      await tx.workCalendar.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });
      await tx.conventionAdaptation.updateMany({ where: { clientCompanyId: m.clientCompanyId }, data: { workspaceId: m.oldWorkspaceId } });

      // Supprimer les COPIES créées par la migration (conventions, règles,
      // config, délégation, espace) — jamais les données d'origine
      await tx.delegated_access.deleteMany({ where: { targetWorkspaceId: m.newWorkspaceId } });
      await tx.conventionCollective.deleteMany({ where: { workspaceId: m.newWorkspaceId } });
      await tx.regleReglementaire.deleteMany({ where: { workspaceId: m.newWorkspaceId } });
      await tx.auditLog.deleteMany({ where: { workspaceId: m.newWorkspaceId, userId: "system-migration" } });
      // Config + espace (Cascade sur tranches)
      await tx.payrollConfig.deleteMany({ where: { workspaceId: m.newWorkspaceId } });
      await tx.workspaces.delete({ where: { id: m.newWorkspaceId } });

      await tx.migration_map.update({ where: { id: m.id }, data: { status: "REVERSED", reversedAt: new Date() } });
    }, { timeout: 60_000, maxWait: 10_000 });
  }

  if (!RUN) log("DRY", "Dry-run — relancez avec --run pour annuler réellement.");
}

// ── Point d'entrée ──
async function main() {
  console.log(`\n=== Migration espaces Le Fiduciaire — mode ${RUN ? "RUN" : "DRY-RUN"} ===\n`);
  try {
    if (mode === "fusion") {
      const source = arg("--source");
      const target = arg("--target");
      if (!source || !target) throw new Error("Usage: migrate-espaces.ts fusion --source <wsId> --target <wsId> [--run]");
      await fusion(source, target);
    } else if (mode === "espaces") {
      if (REVERSE) {
        await reverseEspaces();
      } else {
        const cabinet = arg("--cabinet");
        if (!cabinet) throw new Error("Usage: migrate-espaces.ts espaces --cabinet <wsId> [--run] | espaces --reverse [--run]");
        await migrerEspaces(cabinet);
      }
    } else {
      throw new Error("Commande inconnue — 'fusion' ou 'espaces'");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\nERREUR:", e.message);
  process.exit(1);
});
