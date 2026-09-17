/** Reproduit la génération CNSS en local pour capturer la stack réelle */
import { PrismaClient } from "@prisma/client";
import { generateCnssExportText, storeCnssFile } from "../server/lib/cnss-export.js";

const prisma = new PrismaClient();

async function main() {
  const decl = await prisma.cNSSDeclaration.findFirst({
    where: { workspaceId: "cmu5x9wdi0000o9ptde0wlmzh" },
    include: { client_company: true },
  });
  if (!decl) throw new Error("déclaration introuvable");
  const periodIds = [decl.periodeMois1Id, decl.periodeMois2Id, decl.periodeMois3Id].filter(Boolean) as string[];
  const payslips = await prisma.payslip.findMany({ where: { periodId: { in: periodIds } } });
  console.log("periodIds:", periodIds.length, "| payslips:", payslips.length);

  // Même logique que la route
  const employeeMap = new Map<string, any>();
  const moisTrimestre = [7, 8, 9];
  for (const ps of payslips) {
    if (!employeeMap.has(ps.employeeId)) {
      const parts = ps.nomPrenom.split(" ");
      employeeMap.set(ps.employeeId, {
        matricule: ps.matricule, nom: parts[parts.length - 1] || "", prenom: parts.slice(0, -1).join(" ") || "",
        salaireBrut: [0, 0, 0], cotSal: 0, cotPat: 0, jours: [0, 0, 0],
      });
    }
    const emp = employeeMap.get(ps.employeeId)!;
    const moisIndex = moisTrimestre.indexOf(ps.mois);
    if (moisIndex >= 0) {
      (emp.salaireBrut as number[])[moisIndex] += ps.salaireBrutEffectif;
      (emp.jours as number[])[moisIndex] += ps.joursTravailles;
    }
    emp.cotSal += ps.retenueCnssSalarial;
    emp.cotPat += ps.retenueCnssPatronal;
  }

  try {
    const exportText = generateCnssExportText({
      matriculeEmployeur: decl.client_company.matriculeCnss || "INCONNU",
      raisonSociale: decl.client_company.raisonSociale,
      trimestre: decl.trimestre, annee: decl.annee, numeroTrimestre: decl.numeroTrimestre,
      nombreSalaries: decl.nombreSalaries, totalSalaires: decl.totalSalaires,
      totalCotisationsSalariales: decl.totalCotisationsSalariales,
      totalCotisationsPatronales: decl.totalCotisationsPatronales,
      employees: Array.from(employeeMap.values()).map((e: any) => ({
        matriculeCnss: e.matricule, nom: e.nom, prenom: e.prenom,
        salaireBrutMois1: e.salaireBrut[0], salaireBrutMois2: e.salaireBrut[1], salaireBrutMois3: e.salaireBrut[2],
        cotisationSalariale: e.cotSal, cotisationPatronale: e.cotPat,
        nombreJoursMois1: e.jours[0], nombreJoursMois2: e.jours[1], nombreJoursMois3: e.jours[2],
      })),
    });
    console.log("generateCnssExportText OK — longueur:", exportText.length);
    const chemin = storeCnssFile(`test_cnss.txt`, exportText);
    console.log("storeCnssFile OK:", chemin);
  } catch (e: any) {
    console.error("ÉCHEC:", e.constructor.name, e.message);
    console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
