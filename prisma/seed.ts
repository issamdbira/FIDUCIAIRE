/**
 * Seed — Crée les 2 utilisateurs initiaux :
 * 1. Propriétaire de la fiduciaire (PROPRIETAIRE, VALIDE)
 * 2. Gestionnaire de paie (GESTIONNAIRE, VALIDE)
 *
 * + 1 workspace par défaut + config paie par défaut
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/lib/auth.js";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Propriétaire
  const proprio = await prisma.user.upsert({
    where: { email: "proprietaire@lefiduciaire.tn" },
    update: {},
    create: {
      email: "proprietaire@lefiduciaire.tn",
      passwordHash: await hashPassword("Fiduciaire2026!"),
      fullName: "Propriétaire Fiduciaire",
      role: "PROPRIETAIRE",
      statut: "VALIDE",
    },
  });
  console.log("✅ Propriétaire créé:", proprio.email);

  // 2. Gestionnaire
  const gestionnaire = await prisma.user.upsert({
    where: { email: "gestionnaire@lefiduciaire.tn" },
    update: {},
    create: {
      email: "gestionnaire@lefiduciaire.tn",
      passwordHash: await hashPassword("Gestion2026!"),
      fullName: "Gestionnaire Paie",
      role: "GESTIONNAIRE",
      statut: "VALIDE",
    },
  });
  console.log("✅ Gestionnaire créé:", gestionnaire.email);

  // 3. Workspace par défaut
  const workspace = await prisma.workspace.upsert({
    where: { id: "ws-default" },
    update: {},
    create: {
      id: "ws-default",
      name: "Fiduciaire — Cabinet principal",
      matriculeCnss: "0000000000",
      matriculeFiscal: "0000000000",
      address: "Tunis, Tunisie",
      secteur: "non_agricole",
    },
  });
  console.log("✅ Workspace créé:", workspace.name);

  // 4. Lier les utilisateurs au workspace
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: proprio.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: proprio.id, workspaceId: workspace.id, role: "PROPRIETAIRE" },
  });
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: gestionnaire.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: gestionnaire.id, workspaceId: workspace.id, role: "GESTIONNAIRE" },
  });
  console.log("✅ Membres liés au workspace");

  // 5. Config paie par défaut (avec barème IRPP)
  const existingConfig = await prisma.payrollConfig.findUnique({ where: { workspaceId: workspace.id } });
  if (!existingConfig) {
    await prisma.payrollConfig.create({
      data: {
        workspaceId: workspace.id,
        tranchesIRPP: {
          create: [
            { min: 0, max: 5000, taux: 0, ordre: 1 },
            { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
            { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
            { min: 20000, max: 30000, taux: 0.30, ordre: 4 },
            { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
            { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
            { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
            { min: 70000, max: null, taux: 0.40, ordre: 8 },
          ],
        },
      },
    });
    console.log("✅ Config paie par défaut créée (barème IRPP 8 tranches)");
  }

  console.log("\n🎉 Seed terminé !");
  console.log("   Propriétaire : proprietaire@lefiduciaire.tn / Fiduciaire2026!");
  console.log("   Gestionnaire  : gestionnaire@lefiduciaire.tn / Gestion2026!");

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
