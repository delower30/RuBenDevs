// backend/tests/05_cancellation_rules.test.ts
import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { matchRideIntoPool, cancelRideRequest } from '../src/services/poolService';

const prisma = new PrismaClient();

describe('Invariant 5: Cancellation Rules & Capacity Restoration', () => {
  it('should restore pool seat when passenger cancels before trip start', async () => {
    // 1. Get user & pool
    const passenger = await prisma.user.findFirst({ where: { role: 'PASSENGER' } });
    let pool = await prisma.pool.findFirst({ where: { currentZone: 'Banani', status: 'OPEN' } });
    if (!pool) {
      const jashim = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
      const bullet = await prisma.vehicle.findFirst({ where: { name: 'Bullet' } });
      pool = await prisma.pool.create({
        data: {
          driverId: jashim!.id,
          vehicleId: bullet!.id,
          currentZone: 'Banani',
          destinationZone: 'Mohakhali',
          maxCapacity: 3,
          occupiedSeats: 0,
          status: 'OPEN',
        },
      });
    }

    const initialSeats = pool!.occupiedSeats;

    // 2. Book 1 seat
    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: passenger!.id,
        pickupZone: 'Banani',
        destinationZone: 'Mohakhali',
        requestedSeats: 1,
        status: 'REQUESTED',
      },
    });

    await matchRideIntoPool(ride.id);

    const bookedPool = await prisma.pool.findUnique({ where: { id: pool!.id } });
    expect(bookedPool!.occupiedSeats).toBe(initialSeats + 1);

    // 3. Cancel the ride
    await cancelRideRequest(ride.id, passenger!.id);

    // 4. Verify pool seat restored
    const restoredPool = await prisma.pool.findUnique({ where: { id: pool!.id } });
    expect(restoredPool!.occupiedSeats).toBe(initialSeats);
  });
});
