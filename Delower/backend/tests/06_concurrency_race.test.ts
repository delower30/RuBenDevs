// backend/tests/06_concurrency_race.test.ts
import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { matchRideIntoPool, CapacityExceededError } from '../src/services/poolService';

const prisma = new PrismaClient();

describe('Invariant 6: High-Concurrency Last-Seat Race Condition Defense', () => {
  it('should handle simultaneous bookings without exceeding Bullet 3-seat limit', async () => {
    // Clean existing pools to guarantee single vehicle isolation
    await prisma.poolMembership.deleteMany({});
    await prisma.pool.deleteMany({});

    const jashim = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    const bullet = await prisma.vehicle.findFirst({ where: { name: 'Bullet' } });

    const pool = await prisma.pool.create({
      data: {
        driverId: jashim!.id,
        vehicleId: bullet!.id,
        currentZone: 'Banani',
        destinationZone: 'Mohakhali',
        maxCapacity: 3,
        occupiedSeats: 2, // 1 seat available
        status: 'OPEN',
      },
    });

    const shirin = await prisma.user.findFirst({ where: { email: 'shirin@dhakatesla.com' } });

    // 2. Create 5 concurrent ride requests competing for the 1 remaining seat
    const ridePromises = Array.from({ length: 5 }, async (_, i) => {
      const ride = await prisma.rideRequest.create({
        data: {
          passengerId: shirin!.id,
          pickupZone: 'Banani',
          destinationZone: 'Mohakhali',
          requestedSeats: 1,
          status: 'REQUESTED',
        },
      });
      return ride;
    });

    const rides = await Promise.all(ridePromises);

    // 3. Fire all 5 matching requests simultaneously
    const results = await Promise.allSettled(
      rides.map((r) => matchRideIntoPool(r.id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    // 4. Invariant Assertion: Exactly 1 can win the last seat! 4 must be rejected!
    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(4);

    // 5. Database check: Bullet occupancy must equal exactly 3 (never 4 or 5)
    const finalPool = await prisma.pool.findUnique({ where: { id: pool!.id } });
    expect(finalPool!.occupiedSeats).toBe(3);
  });
});
