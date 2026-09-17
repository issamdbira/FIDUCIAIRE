/**
 * PRÉPARATION DU BANC DE TEST E2E — Revue réelle de l'application
 * Crée un environnement de test ISOLÉ en base de production :
 *   - 1 utilisateur test PROPRIETAIRE (e2e) + 2 utilisateurs (G, L)
 *   - 1 espace ENTREPRISE "E2E Test SARL" + 1 espace CABINET "Cabinet E2E"
 *   - membres rattachés
 * AUCUNE donnée existante n'est modifiée. Tout est préfixé "E2E" pour être
 * identifiable et supprimable (scripts/e2e-cleanup.ts).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "E2E-Test-2026!";

async function main() {
  // ── nettoyage préalable (idempotent) ──────────────────────────────────
  const oldUsers = await prisma.users.findMany({
    where: { email: { startsWith: "e2e-" } },
    select: { id: true },
  });
  if (oldUsers.length) {
    const ids = oldUsers.map((u) => u.id);
    await prisma.workspace_members.deleteMany({ where: { userId: { in: ids } } });
    await prisma.users.deleteMany({ where: { id: { in: ids } } });
    console.log(`nettoyé ${ids.length} anciens utilisateurs e2e`);
  }
  const oldWs = await prisma.workspaces.findMany({
    where: { name: { startsWith: "E2E" } },
    select: { id: true },
  });
  if (oldWs.length) {
    const wids = oldWs.map((w) => w.id);
    await prisma.workspace_members.deleteMany({ where: { workspaceId: { in: wids } } });
    await prisma.workspaces.deleteMany({ where: { id: { in: wids } } });
    console.log(`nettoyé ${wids.length} anciens workspaces e2e`);
  }

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── espace ENTREPRISE (cas A — TPE/PME) ───────────────────────────────
  const wsEntreprise = await prisma.workspaces.create({
    data: {
      name: "E2E Test SARL",
      type: "ENTREPRISE",
      matriculeCnss: "E2E-123456",
      matriculeFiscal: "E2E-789",
      address: "1 rue du Test, Tunis",
    },
  });

  // ── espace CABINET (cas B — cabinet multi-sociétés) ───────────────────
  const wsCabinet = await prisma.workspaces.create({
    data: { name: "E2E Cabinet Test", type: "CABINET" },
  });

  // ── utilisateurs ──────────────────────────────────────────────────────
  const mkUser = (email: string, name: string) =>
    prisma.users.create({ data: { email, passwordHash: hash, fullName: name, statut: "VALIDE" } });

  const uP = await mkUser("e2e-proprio@test.tn", "E2E Propriétaire");
  const uG = await mkUser("e2e-gestion@test.tn", "E2E Gestionnaire");
  const uL = await mkUser("e2e-lecteur@test.tn", "E2E Lecteur");
  const uCab = await mkUser("e2e-cabinet@test.tn", "E2E Cabinet Proprio");

  // ── memberships ───────────────────────────────────────────────────────
  await prisma.workspace_members.createMany({
    data: [
      { userId: uP.id, workspaceId: wsEntreprise.id, role: "PROPRIETAIRE" },
      { userId: uG.id, workspaceId: wsEntreprise.id, role: "GESTIONNAIRE" },
      { userId: uL.id, workspaceId: wsEntreprise.id, role: "LECTEUR" },
      { userId: uCab.id, workspaceId: wsCabinet.id, role: "PROPRIETAIRE" },
    ],
  });

  console.log(JSON.stringify({
    ok: true,
    espaceEntreprise: { id: wsEntreprise.id, name: wsEntreprise.name },
    espaceCabinet: { id: wsCabinet.id, name: wsCabinet.name },
    comptes: {
      proprio: { email: "e2e-proprio@test.tn", mdp: PASSWORD },
      gestion: { email: "e2e-gestion@test.tn", mdp: PASSWORD },
      lecteur: { email: "e2e-lecteur@test.tn", mdp: PASSWORD },
      cabinet: { email: "e2e-cabinet@test.tn", mdp: PASSWORD },
    },
  }, null, 2));
}

main()
  .catch((e) => { console.error("ÉCHEC:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
