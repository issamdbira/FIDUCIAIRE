/** Crée les 3 contrats + versions en base (le UI étant bloqué par le sélecteur vide) */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const ws = await prisma.workspaces.findFirst({ where: { name: "E2E Test SARL" } });
  if (!ws) throw new Error("ws introuvable");
  const employees = await prisma.employees.findMany({ where: { workspaceId: ws.id }, orderBy: { lastName: "asc" } });
  if (employees.length !== 3) throw new Error(`attendu 3 salariés, trouvé ${employees.length}`);
  const specs = [
    { emp: employees.find((e) => e.lastName === "Ben Salah")!, type: "CDI", poste: "Comptable", salaire: 1200, heures: 48 },
    { emp: employees.find((e) => e.lastName === "Trabelsi")!, type: "CDD", poste: "Assistante administrative", salaire: 950, heures: 48, cdd: true },
    { emp: employees.find((e) => e.lastName === "Gharbi")!, type: "CDI", poste: "Technicien", salaire: 1500, heures: 40 },
  ];
  for (const s of specs) {
    const debut = new Date("2026-01-02");
    const c = await prisma.contract.create({
      data: {
        employeeId: s.emp.id, workspaceId: ws.id, type: s.type as any, statut: "ACTIF" as any,
        poste: s.poste, dateDebut: debut, periodeEssai: 30,
        ...(s.cdd ? { dateFin: new Date("2026-12-31") } : {}),
      },
    });
    await prisma.contractVersion.create({
      data: {
        contractId: c.id, salaireBrut: s.salaire, salaireBrutAnnuel: s.salaire * 12,
        heuresHebdomadaires: s.heures, heuresMensuelles: s.heures === 48 ? 208 : 173.33,
        motifChangement: "embauche", dateEffet: debut,
      },
    });
    console.log(`contrat ${s.type} créé pour ${s.emp.lastName} (${s.salaire} DT, ${s.heures}h)`);
  }
  console.log("3 contrats + versions créés");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
