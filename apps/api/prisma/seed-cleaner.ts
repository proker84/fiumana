import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Sofia123!', 10);

  const sofia = await prisma.user.upsert({
    where: { email: 'sofia@fiumana.it' },
    update: {},
    create: {
      email: 'sofia@fiumana.it',
      name: 'Sofia Rossi',
      passwordHash,
      role: UserRole.CLEANER,
      phone: '+39 333 1234567',
    },
  });

  console.log('Utente cleaner creato:', sofia);
  console.log('\nCredenziali di accesso:');
  console.log('Email: sofia@fiumana.it');
  console.log('Password: Sofia123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
