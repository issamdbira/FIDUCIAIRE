// =============================================================================
// Le Fiduciaire — Seed : Création du premier propriétaire + workspace
// =============================================================================
//
// Ce script crée le premier compte PROPRIETAIRE (statut VALIDE) et le workspace
// du cabinet fiduciaire. Il est idempotent : relancer ne crée pas de doublon.
//
// USAGE :
//   DATABASE_URL='votre-neon-url' \
//   SEED_OWNER_EMAIL='votre@email.com' \
//   SEED_OWNER_PASSWORD='votre-mot-de-passe' \
//   npx tsx prisma/seed-owner.ts
//
// VARIABLES D'ENVIRONNEMENT :
//   SEED_OWNER_EMAIL       — email du propriétaire (défaut : proprietaire@lefiduciaire.tn)
//   SEED_OWNER_PASSWORD    — mot de passe du propriétaire (OBLIGATOIRE, pas de défaut)
//   SEED_OWNER_NAME        — nom complet (défaut : Propriétaire Fiduciaire)
//   SEED_WORKSPACE_NAME    — nom du cabinet (défaut : Fiduciaire Principale)
//
// SÉCURITÉ : aucun mot de passe n'est en dur dans ce fichier committé.
// =============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed propriétaire + workspace\n");

  // ── Lecture des paramètres ──────────────────────────────────────────────
  const email = process.env.SEED_OWNER_EMAIL || "proprietaire@lefiduciaire.tn";
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!password) {
    console.error("❌ SEED_OWNER_PASSWORD est requis. Usage :");
    console.error("   SEED_OWNER_PASSWORD='votre-mdp' npx tsx prisma/seed-owner.ts");
    process.exit(1);
  }

  const fullName = process.env.SEED_OWNER_NAME || "Propriétaire Fiduciaire";
  const wsName = process.env.SEED_WORKSPACE_NAME || "Fiduciaire Principale";

  // ── 1. Créer ou retrouver le workspace ──────────────────────────────────
  const workspace = await prisma.workspaces.upsert({
    where: { id: "ws-fiduciaire-default" },
    update: { name: wsName },
    create: {
      id: "ws-fiduciaire-default",
      name: wsName,
      secteur: "non_agricole",
      tauxAtMp: 0.01,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Workspace : ${workspace.name} (${workspace.id})`);

  // ── 2. Créer ou retrouver le propriétaire ───────────────────────────────
  const existingUser = await prisma.users.findUnique({ where: { email } });

  let userId: string;

  if (existingUser) {
    // L'utilisateur existe déjà — vérifier qu'il est bien propriétaire validé
    userId = existingUser.id;
    if (existingUser.role !== "PROPRIETAIRE" || existingUser.statut !== "VALIDE") {
      // Corriger le rôle et le statut si nécessaire
      await prisma.users.update({
        where: { id: userId },
        data: { role: "PROPRIETAIRE", statut: "VALIDE", updatedAt: new Date() },
      });
      console.log(`✅ Utilisateur existant promu en PROPRIETAIRE VALIDE : ${email}`);
    } else {
      console.log(`⏭️  Propriétaire déjà existant : ${email} (${userId})`);
    }
  } else {
    // Créer le propriétaire
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.users.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "PROPRIETAIRE",
        statut: "VALIDE",
        updatedAt: new Date(),
      },
    });
    userId = user.id;
    console.log(`✅ Propriétaire créé : ${email} (${userId})`);
  }

  // ── 3. Assigner au workspace ────────────────────────────────────────────
  await prisma.workspace_members.upsert({
    where: {
      userId_workspaceId: { userId, workspaceId: workspace.id },
    },
    update: {},
    create: {
      userId,
      workspaceId: workspace.id,
      role: "PROPRIETAIRE",
    },
  });
  console.log(`✅ Membre du workspace : PROPRIETAIRE`);

  // ── 4. Résumé ───────────────────────────────────────────────────────────
  console.log("\n🌱 Seed terminé avec succès");
  console.log(`   Email  : ${email}`);
  console.log(`   Rôle   : PROPRIETAIRE`);
  console.log(`   Statut : VALIDE`);
  console.log(`   Workspace : ${workspace.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
