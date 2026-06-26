import { prisma } from "../src/db.js";
import { SalesControlService } from "../src/modules/sales-control/sales-control.service.js";

const emails = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["is.togo41@gmail.com", "is.togo41@gmail.coom"];

const service = new SalesControlService(prisma);

async function main() {
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      console.log("NOT FOUND:", email);
      continue;
    }
    console.log("FOUND:", user.id, user.email, user.displayName, user.role);
    const result = await service.deleteCustomer(user.id);
    console.log("DELETED:", result);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
