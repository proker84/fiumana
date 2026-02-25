import { PrismaClient, UserRole, PropertyType, ContractType, StockCategory, FaqCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fiumana.it' },
    update: {},
    create: {
      email: 'admin@fiumana.it',
      passwordHash: adminPassword,
      name: 'Admin Fiumana',
      role: UserRole.ADMIN,
      phone: '+39 123 456 7890',
    },
  });
  console.log('Created admin:', admin.email);

  // Create cleaner user
  const cleanerPassword = await bcrypt.hash('cleaner123', 10);
  const cleaner = await prisma.user.upsert({
    where: { email: 'pulizie@fiumana.it' },
    update: {},
    create: {
      email: 'pulizie@fiumana.it',
      passwordHash: cleanerPassword,
      name: 'Maria Rossi',
      role: UserRole.CLEANER,
      phone: '+39 333 123 4567',
    },
  });
  console.log('Created cleaner:', cleaner.email);

  // Create guest user
  const guestPassword = await bcrypt.hash('guest123', 10);
  const guest = await prisma.user.upsert({
    where: { email: 'ospite@test.it' },
    update: {},
    create: {
      email: 'ospite@test.it',
      passwordHash: guestPassword,
      name: 'Marco Bianchi',
      role: UserRole.GUEST,
      phone: '+39 340 987 6543',
    },
  });
  console.log('Created guest:', guest.email);

  // Create a sample property
  const property = await prisma.property.upsert({
    where: { id: 'prop-001' },
    update: {},
    create: {
      id: 'prop-001',
      title: 'Villa Mare Azzurro',
      description: 'Splendida villa con vista mare, 3 camere da letto, giardino privato e piscina.',
      type: PropertyType.VACATION,
      contractType: ContractType.SHORT_TERM,
      price: 150,
      areaSqm: 120,
      bedrooms: 3,
      bathrooms: 2,
      sleeps: 6,
      isFeatured: true,
    },
  });
  console.log('Created property:', property.title);

  // Create location for property
  await prisma.location.upsert({
    where: { propertyId: property.id },
    update: {},
    create: {
      address: 'Via del Mare 15',
      city: 'Fiumana',
      province: 'FC',
      country: 'Italia',
      lat: 44.0564,
      lng: 12.1334,
      propertyId: property.id,
    },
  });

  // Create stock items
  const stockItems = [
    { name: 'Lenzuola matrimoniali', category: StockCategory.BIANCHERIA, quantity: 8, minQuantity: 4 },
    { name: 'Asciugamani grandi', category: StockCategory.BIANCHERIA, quantity: 12, minQuantity: 6 },
    { name: 'Asciugamani piccoli', category: StockCategory.BIANCHERIA, quantity: 15, minQuantity: 8 },
    { name: 'Detersivo piatti', category: StockCategory.PULIZIA, quantity: 3, minQuantity: 2 },
    { name: 'Sapone mani', category: StockCategory.BAGNO, quantity: 5, minQuantity: 3 },
    { name: 'Carta igienica', category: StockCategory.BAGNO, quantity: 20, minQuantity: 10 },
    { name: 'Capsule caffè', category: StockCategory.CUCINA, quantity: 30, minQuantity: 15 },
  ];

  for (const item of stockItems) {
    await prisma.stockItem.upsert({
      where: { propertyId_name: { propertyId: property.id, name: item.name } },
      update: {},
      create: {
        propertyId: property.id,
        ...item,
      },
    });
  }
  console.log('Created stock items');

  // Create FAQ items
  const faqs = [
    { question: 'Come funziona il WiFi?', answer: 'Il WiFi è disponibile in tutta la casa. Nome rete: VillaMare_Guest, Password: benvenuti2024', category: FaqCategory.WIFI },
    { question: 'Dove posso parcheggiare?', answer: 'Sono disponibili 2 posti auto nel garage privato. Il telecomando è sul mobile all\'ingresso.', category: FaqCategory.PARKING },
    { question: 'A che ora è il check-in?', answer: 'Il check-in è dalle 15:00 alle 20:00. Per orari diversi, contattaci in anticipo.', category: FaqCategory.CHECKIN },
    { question: 'A che ora è il check-out?', answer: 'Il check-out è entro le 10:00. Lascia le chiavi nella cassetta di sicurezza.', category: FaqCategory.CHECKOUT },
    { question: 'Come funziona la lavatrice?', answer: 'La lavatrice è nel bagno di servizio. Detersivo disponibile sotto il lavandino. Programma consigliato: 40°C cotone.', category: FaqCategory.AMENITIES },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.faqItem.create({
      data: {
        propertyId: property.id,
        ...faqs[i],
        sortOrder: i,
      },
    });
  }
  console.log('Created FAQ items');

  // Create a sample cleaning task
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await prisma.cleaning.create({
    data: {
      propertyId: property.id,
      cleanerId: cleaner.id,
      scheduledDate: tomorrow,
      notes: 'Pulizia completa pre-arrivo ospiti',
    },
  });
  console.log('Created sample cleaning task');

  console.log('Seeding completed!');
  console.log('\n--- Credenziali di test ---');
  console.log('Admin: admin@fiumana.it / admin123');
  console.log('Pulizie: pulizie@fiumana.it / cleaner123');
  console.log('Ospite: ospite@test.it / guest123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
