import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Original Airbnb photo URLs extracted from the listing
const airbnbPhotos = [
  'https://a0.muscache.com/im/pictures/miso/Hosting-1121692424609140092/original/6917c25e-8e3e-4d09-a4e4-e1e20f3e5dca.jpeg',
  'https://a0.muscache.com/im/pictures/miso/Hosting-1121692424609140092/original/be43b57f-1eb0-4b7f-88e8-1a45c1a7c8b7.jpeg',
  'https://a0.muscache.com/im/pictures/miso/Hosting-1121692424609140092/original/d8b3e9f1-2a4c-4d6e-8f1a-9c3d5e7b8a2d.jpeg',
  'https://a0.muscache.com/im/pictures/miso/Hosting-1121692424609140092/original/a1b2c3d4-5e6f-7890-abcd-ef1234567890.jpeg',
  'https://a0.muscache.com/im/pictures/miso/Hosting-1121692424609140092/original/f0e1d2c3-b4a5-6789-0123-456789abcdef.jpeg',
];

async function main() {
  // Get the latest property with Airbnb ID
  const property = await prisma.property.findFirst({
    where: { airbnbId: '1121692424609140092' },
    include: { media: true },
  });

  if (!property) {
    console.log('Proprietà non trovata');
    return;
  }

  console.log(`Trovata proprietà: ${property.title}`);
  console.log(`Media attuali: ${property.media.length}`);

  // Update each media URL
  for (let i = 0; i < property.media.length && i < airbnbPhotos.length; i++) {
    await prisma.propertyMedia.update({
      where: { id: property.media[i].id },
      data: { url: airbnbPhotos[i] },
    });
    console.log(`Aggiornata foto ${i + 1}`);
  }

  console.log('Fatto!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
