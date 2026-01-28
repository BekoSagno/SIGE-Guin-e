import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer la base de données
  await prisma.nILMSignature.deleteMany();
  await prisma.energyData.deleteMany();
  await prisma.meter.deleteMany();
  await prisma.financial.deleteMany();
  await prisma.loadSheddingEvent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.home.deleteMany();
  await prisma.user.deleteMany();

  // Hash password par défaut
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Créer des utilisateurs de test
  const userCitoyen1 = await prisma.user.create({
    data: {
      nom: 'Mamadou Diallo',
      email: 'mamadou@test.com',
      passwordHash: hashedPassword,
      role: 'CITOYEN',
    },
  });

  const userCitoyen2 = await prisma.user.create({
    data: {
      nom: 'Fatoumata Bah',
      email: 'fatou@test.com',
      passwordHash: hashedPassword,
      role: 'CITOYEN',
    },
  });

  const userEDG = await prisma.user.create({
    data: {
      nom: 'Ibrahim Camara',
      email: 'agent@edg.gn',
      passwordHash: hashedPassword,
      role: 'AGENT_EDG',
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      nom: 'Ministre de l\'Énergie',
      email: 'admin@energie.gn',
      passwordHash: hashedPassword,
      role: 'ADMIN_ETAT',
    },
  });

  console.log('✅ Utilisateurs créés');

  // Créer des foyers à Dixinn
  const homeDixinn1 = await prisma.home.create({
    data: {
      nom: 'Villa Diallo',
      ville: 'Dixinn',
      type: 'HYBRIDE',
      latitude: 9.5383,
      longitude: -13.6574,
      proprietaireId: userCitoyen1.id,
    },
  });

  const homeDixinn2 = await prisma.home.create({
    data: {
      nom: 'Résidence Bah',
      ville: 'Dixinn',
      type: 'EDG',
      latitude: 9.5412,
      longitude: -13.6598,
      proprietaireId: userCitoyen2.id,
    },
  });

  // Créer des foyers à Kaloum
  const homeKaloum1 = await prisma.home.create({
    data: {
      nom: 'Appartement Camara',
      ville: 'Kaloum',
      type: 'SOLAIRE',
      latitude: 9.5092,
      longitude: -13.7122,
      proprietaireId: userCitoyen1.id,
    },
  });

  const homeKaloum2 = await prisma.home.create({
    data: {
      nom: 'Bureau Ministère',
      ville: 'Kaloum',
      type: 'EDG',
      latitude: 9.5115,
      longitude: -13.7145,
      proprietaireId: userAdmin.id,
    },
  });

  console.log('✅ Foyers créés (Dixinn et Kaloum)');

  // Créer des compteurs financiers
  await prisma.financial.createMany({
    data: [
      {
        homeId: homeDixinn1.id,
        balance: 50000,
        monthlyBudget: 100000,
        lastTopup: new Date(),
      },
      {
        homeId: homeDixinn2.id,
        balance: 25000,
        monthlyBudget: 80000,
        lastTopup: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        homeId: homeKaloum1.id,
        balance: 0,
        monthlyBudget: 0,
      },
      {
        homeId: homeKaloum2.id,
        balance: 100000,
        monthlyBudget: 150000,
        lastTopup: new Date(),
      },
    ],
  });

  console.log('✅ Données financières créées');

  // Créer des kits IoT (Meters)
  const meter1 = await prisma.meter.create({
    data: {
      homeId: homeDixinn1.id,
      firmwareVersion: 'v1.2.3',
      status: 'ONLINE',
      lastSeen: new Date(),
    },
  });

  const meter2 = await prisma.meter.create({
    data: {
      homeId: homeDixinn2.id,
      firmwareVersion: 'v1.2.3',
      status: 'ONLINE',
      lastSeen: new Date(),
    },
  });

  const meter3 = await prisma.meter.create({
    data: {
      homeId: homeKaloum1.id,
      firmwareVersion: 'v1.2.0',
      status: 'ONLINE',
      lastSeen: new Date(),
    },
  });

  console.log('✅ Kits IoT créés');

  // Créer des données énergétiques de test
  const now = new Date();
  const energyDataEntries = [];

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    energyDataEntries.push(
      {
        meterId: meter1.id,
        timestamp,
        voltage: 220 + Math.random() * 10,
        current: 5 + Math.random() * 3,
        power: 1100 + Math.random() * 500,
        energySource: i % 2 === 0 ? 'GRID' : 'SOLAR',
      },
      {
        meterId: meter2.id,
        timestamp,
        voltage: 220 + Math.random() * 10,
        current: 3 + Math.random() * 2,
        power: 600 + Math.random() * 300,
        energySource: 'GRID',
      }
    );
  }

  await prisma.energyData.createMany({
    data: energyDataEntries,
  });

  console.log('✅ Données énergétiques créées');

  // Créer des signatures NILM (appareils détectés)
  await prisma.nILMSignature.createMany({
    data: [
      {
        meterId: meter1.id,
        deviceName: 'Climatiseur Salon',
        deviceType: 'CLIM',
        powerSignature: 1500,
        isActive: true,
      },
      {
        meterId: meter1.id,
        deviceName: 'Réfrigérateur',
        deviceType: 'FRIGO',
        powerSignature: 200,
        isActive: true,
      },
      {
        meterId: meter2.id,
        deviceName: 'Chauffe-eau',
        deviceType: 'CHAUFFE_EAU',
        powerSignature: 2000,
        isActive: false,
      },
    ],
  });

  console.log('✅ Signatures NILM créées');

  // Créer quelques incidents de test
  await prisma.incident.create({
    data: {
      reporterId: userCitoyen1.id,
      homeId: homeDixinn1.id,
      description: 'Poteau électrique penché dans la rue principale',
      latitude: 9.5383,
      longitude: -13.6574,
      status: 'OPEN',
      incidentType: 'PANNE',
    },
  });

  console.log('✅ Incidents créés');
  console.log('🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('Citoyen: mamadou@test.com / password123');
  console.log('Agent EDG: agent@edg.gn / password123');
  console.log('Admin État: admin@energie.gn / password123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
