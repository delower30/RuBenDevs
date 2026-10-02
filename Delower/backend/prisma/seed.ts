import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  const passwordHash = await bcrypt.hash('tesla123', 10);

  // 1. Seed Driver: Jashim
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim.driver@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Jashim Uddin',
      email: 'jashim.driver@dhakatesla.com',
      passwordHash,
      phone: '+8801711000001',
      role: 'DRIVER',
    },
  });

  // 2. Seed Jashim's 3-Seater Tesla: Bullet
  const bullet = await prisma.vehicle.upsert({
    where: { licensePlate: 'DHA-HA-11-2024' },
    update: {},
    create: {
      driverId: jashim.id,
      name: 'Bullet',
      model: 'Electric Rickshaw Tesla (3-Wheeler)',
      licensePlate: 'DHA-HA-11-2024',
      capacity: 3, // Inviolable physical capacity limit
      isActive: true,
    },
  });

  // 3. Seed Passenger 1: Nusrat
  const nusrat = await prisma.user.upsert({
    where: { email: 'nusrat@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Nusrat Jahan',
      email: 'nusrat@dhakatesla.com',
      passwordHash,
      phone: '+8801711000002',
      role: 'PASSENGER',
    },
  });

  // 4. Seed Passenger 2: Rafiq
  const rafiq = await prisma.user.upsert({
    where: { email: 'rafiq@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Rafiqul Islam',
      email: 'rafiq@dhakatesla.com',
      passwordHash,
      phone: '+8801711000003',
      role: 'PASSENGER',
    },
  });

  // 5. Seed Passenger 3: Shirin (The Contender)
  const shirin = await prisma.user.upsert({
    where: { email: 'shirin@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Shirin Akter',
      email: 'shirin@dhakatesla.com',
      passwordHash,
      phone: '+8801711000004',
      role: 'PASSENGER',
    },
  });

  // 6. Pre-load Wallets with ৳1,000.00 (100,000 poysha) each
  const users = [jashim, nusrat, rafiq, shirin];
  for (const user of users) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balancePoysha: 100000,
        currency: 'BDT',
      },
    });
  }

  // 7. Seed Initial Active Pool for Bullet at Banani
  const existingPool = await prisma.pool.findFirst({
    where: { driverId: jashim.id, status: 'OPEN' },
  });

  if (!existingPool) {
    await prisma.pool.create({
      data: {
        driverId: jashim.id,
        vehicleId: bullet.id,
        currentZone: 'Banani',
        destinationZone: 'Mohakhali',
        maxCapacity: 3,
        occupiedSeats: 0,
        status: 'OPEN',
      },
    });
  }

  console.log('✅ Dhaka Tesla story seed data populated: Jashim, Bullet (3 seats), Nusrat, Rafiq, Shirin.');
}

if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
