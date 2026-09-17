/** Inspection de l'état E2E : périodes, bulletins, anomalies, config paie */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const ws = await prisma.workspaces.findFirst({ where: { name: "E2E Test SARL" } });
  if (!ws) throw new Error("ws introuvable");
  const periods = await prisma.payrollPeriod.findMany({ where: { workspaceId: ws.id } });
  const payslips = await prisma.payslip.count({ where: { workspaceId: ws.id } });
  const anomalies = await prisma.anomaly.findMany({ where: { workspaceId: ws.id } });
  const config = await prisma.payrollConfig.findUnique({ where: { workspaceId: ws.id } });
  const employees = await prisma.employees.count({ where: { workspaceId: ws.id } });
  console.log(JSON.stringify({
    workspace: ws.id,
    periodes: periods.map((p) => ({ id: p.id, mois: p.mois, annee: p.annee, statut: p.statut })),
    nbBulletins: payslips,
    anomalies: anomalies.map((a) => ({ code: a.code, niveau: a.niveau, message: a.message })),
    configPaiePresente: !!config,
    configTranchesIrpp: config ? await prisma.tranches_irpp.count({ where: { payrollConfigId: config.id } }) : 0,
    nbSalaries: employees,
  }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
