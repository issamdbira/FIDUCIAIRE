/** Complète le banc E2E : établissement principal (modèle Establishment réel) */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const ws = await prisma.workspaces.findFirst({ where: { name: "E2E Test SARL" } });
  if (!ws) throw new Error("workspace E2E introuvable");
  const cc = await prisma.clientCompany.findFirst({ where: { workspaceId: ws.id } });
  if (!cc) throw new Error("clientCompany E2E introuvable");
  const et = await prisma.establishment.findFirst({ where: { clientCompanyId: cc.id } });
  if (et) { console.log("établissement existe:", et.id, et.designation); return; }
  const net = await prisma.establishment.create({
    data: {
      clientCompanyId: cc.id,
      designation: "Siège social",
      isPrincipal: true,
      adresse: "1 rue du Test, Tunis",
      isActive: true,
    },
  });
  console.log("établissement créé:", net.id);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
