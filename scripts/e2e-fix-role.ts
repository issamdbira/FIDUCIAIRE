/** Aligne le compte e2e-proprio sur le flux réel /auth/create-space (rôle global PROPRIETAIRE) */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.users.update({
    where: { email: "e2e-proprio@test.tn" },
    data: { role: "PROPRIETAIRE" },
  });
  console.log("rôle global mis à jour:", u.role);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
