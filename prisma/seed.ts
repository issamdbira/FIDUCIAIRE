// =============================================================================
// Le Fiduciaire — Seed Script (Phase 1)
// Utilise les variables d'environnement pour les mots de passe — JAMAIS en dur
// Usage: DATABASE_URL=... npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed Le Fiduciaire — Phase 1\n");

  // --- 1. Créer le workspace par défaut ---
  const workspace = await prisma.workspaces.upsert({
    where: { id: "ws-fiduciaire-default" },
    update: {},
    create: {
      id: "ws-fiduciaire-default",
      name: process.env.SEED_WORKSPACE_NAME || "Fiduciaire Principale",
      matriculeCnss: process.env.SEED_WORKSPACE_MATRICULE || null,
      matriculeFiscal: process.env.SEED_WORKSPACE_FISCAL || null,
      address: process.env.SEED_WORKSPACE_ADDRESS || null,
      secteur: "non_agricole",
      tauxAtMp: 0.01,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

  // --- 2. Seed Propriétaire ---
  const propEmail = process.env.SEED_PROPRIETAIRE_EMAIL || "proprietaire@lefiduciaire.tn";
  const propPassword = process.env.SEED_PROPRIETAIRE_PASSWORD;
  if (!propPassword) {
    throw new Error("SEED_PROPRIETAIRE_PASSWORD requis dans .env — arrêt par sécurité");
  }
  const propHash = await bcrypt.hash(propPassword, 12);

  const proprietaire = await prisma.users.upsert({
    where: { email: propEmail },
    update: {},
    create: {
      email: propEmail,
      passwordHash: propHash,
      fullName: "Propriétaire Fiduciaire",
      role: "PROPRIETAIRE",
      statut: "VALIDE",
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Propriétaire: ${proprietaire.email} (${proprietaire.id})`);

  // Assigner au workspace
  await prisma.workspace_members.upsert({
    where: { userId_workspaceId: { userId: proprietaire.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: proprietaire.id,
      workspaceId: workspace.id,
      role: "PROPRIETAIRE",
    },
  });

  // --- 3. Seed Gestionnaire ---
  const gestEmail = process.env.SEED_GESTIONNAIRE_EMAIL || "gestionnaire@lefiduciaire.tn";
  const gestPassword = process.env.SEED_GESTIONNAIRE_PASSWORD;
  if (!gestPassword) {
    throw new Error("SEED_GESTIONNAIRE_PASSWORD requis dans .env — arrêt par sécurité");
  }
  const gestHash = await bcrypt.hash(gestPassword, 12);

  const gestionnaire = await prisma.users.upsert({
    where: { email: gestEmail },
    update: {},
    create: {
      email: gestEmail,
      passwordHash: gestHash,
      fullName: "Gestionnaire Paie",
      role: "GESTIONNAIRE",
      statut: "VALIDE",
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Gestionnaire: ${gestionnaire.email} (${gestionnaire.id})`);

  await prisma.workspace_members.upsert({
    where: { userId_workspaceId: { userId: gestionnaire.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: gestionnaire.id,
      workspaceId: workspace.id,
      role: "GESTIONNAIRE",
    },
  });

  // --- 4. Seed PayrollConfig par défaut avec tranches IRPP ---
  const IRPP_BAREME_2026 = [
    { min: 0, max: 5000, taux: 0, deduction: 0, ordre: 1 },
    { min: 5000, max: 10000, taux: 0.26, deduction: 1300, ordre: 2 },
    { min: 10000, max: 20000, taux: 0.28, deduction: 1500, ordre: 3 },
    { min: 20000, max: 30000, taux: 0.32, deduction: 2300, ordre: 4 },
    { min: 30000, max: 50000, taux: 0.36, deduction: 3500, ordre: 5 },
    { min: 50000, max: 75000, taux: 0.39, deduction: 5000, ordre: 6 },
    { min: 75000, max: 100000, taux: 0.40, deduction: 5750, ordre: 7 },
    { min: 100000, max: null, taux: 0.40, deduction: 5750, ordre: 8 },
  ];

  const existingConfig = await prisma.payrollConfig.findUnique({ where: { workspaceId: workspace.id } });
  if (!existingConfig) {
    const config = await prisma.payrollConfig.create({
      data: { workspaceId: workspace.id },
    });
    await prisma.tranches_irpp.createMany({
      data: IRPP_BAREME_2026.map((t) => ({
        payrollConfigId: config.id,
        min: t.min,
        max: t.max,
        taux: t.taux,
        ordre: t.ordre,
      })),
    });
    console.log(`✅ PayrollConfig + 8 tranches IRPP créées`);
  } else {
    console.log(`⏭️  PayrollConfig déjà existante — ignorée`);
  }

  console.log("\n🌱 Seed terminé avec succès");
}

main()
  .catch((e) => {
    console.error("❌ Seed échoué:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
