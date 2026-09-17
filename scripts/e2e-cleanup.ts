/** Nettoyage complet du banc E2E — supprime tout ce qui préfixe E2E (workspaces, users, données rattachées) */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspaces.findMany({ where: { name: { startsWith: "E2E" } } });
  const users = await prisma.users.findMany({ where: { email: { startsWith: "e2e-" } }, select: { id: true } });

  for (const w of ws) {
    // Données rattachées à l'espace de test
    await prisma.payslip.deleteMany({ where: { workspaceId: w.id } });
    await prisma.anomaly.deleteMany({ where: { workspaceId: w.id } });
    await prisma.payrollVariable.deleteMany({ where: { workspaceId: w.id } });
    await prisma.attendanceSummary.deleteMany({ where: { workspaceId: w.id } });
    await prisma.attendanceImport.deleteMany({ where: { workspaceId: w.id } });
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: w.id } });
    await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId: w.id } });
    await prisma.documentStorage.deleteMany({ where: { workspaceId: w.id } });
    await prisma.contract.deleteMany({ where: { workspaceId: w.id } });
    await prisma.employees.deleteMany({ where: { workspaceId: w.id } });
    await prisma.establishment.deleteMany({ where: { clientCompanyId: { in: (await prisma.clientCompany.findMany({ where: { workspaceId: w.id }, select: { id: true } })).map((c) => c.id) } } });
    await prisma.clientCompany.deleteMany({ where: { workspaceId: w.id } });
    const configTest = await prisma.payrollConfig.findFirst({ where: { workspaceId: w.id }, select: { id: true } });
    if (configTest) await prisma.tranches_irpp.deleteMany({ where: { payrollConfigId: configTest.id } });
    await prisma.payrollConfig.deleteMany({ where: { workspaceId: w.id } });
    await prisma.auditLog.deleteMany({ where: { workspaceId: w.id } });
    await prisma.delegated_access.deleteMany({ where: { OR: [{ cabinetWorkspaceId: w.id }, { targetWorkspaceId: w.id }] } });
    await prisma.migration_map.deleteMany({ where: { oldWorkspaceId: w.id } });
  }
  // Config créée via la page Config (tranches déjà via cascade config)
  for (const u of users) {
    await prisma.session.deleteMany({ where: { userId: u.id } });
    await prisma.workspace_members.deleteMany({ where: { userId: u.id } });
    await prisma.users.deleteMany({ where: { id: u.id } });
  }
  // Config orpheline éventuelle (workspace déjà supprimé)
  for (const w of ws) {
    await prisma.workspaces.deleteMany({ where: { id: w.id } });
  }

  const restants = await prisma.workspaces.count({ where: { name: { startsWith: "E2E" } } });
  const restantsUsers = await prisma.users.count({ where: { email: { startsWith: "e2e-" } } });
  console.log(JSON.stringify({ workspacesSupprimes: ws.length, usersSupprimes: users.length, restants, restantsUsers }));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
