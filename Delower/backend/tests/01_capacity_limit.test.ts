// backend/tests/01_capacity_limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { matchRideIntoPool, CapacityExceededError } from '../src/services/poolService';

const prisma = new PrismaClient();

describe('Invariant 1: Bullet 3-Seat Capacity Limit Enforcement', () => {
  it('should prevent allocated seats from exceeding Bullet max capacity of 3', async () => {
    let pool = await prisma.pool.findFirst({
      where: { currentZone: 'Banani', status: 'OPEN' },
      include: { vehicle: true },
    });
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
        include: { vehicle: true },
      });
    }
    expect(pool).toBeDefined();
    expect(pool!.maxCapacity).toBe(3);

    // 2. Create a passenger ride requesting 4 seats (4 > 3)
    const passenger = await prisma.user.findFirst({ where: { role: 'PASSENGER' } });
    const excessiveRide = await prisma.rideRequest.create({
      data: {
        passengerId: passenger!.id,
        pickupZone: 'Banani',
        destinationZone: 'Mohakhali',
        requestedSeats: 4,
        status: 'REQUESTED',
      },
    });

    // 3. Attempt to match into pool -> must throw CapacityExceededError
    await expect(matchRideIntoPool(excessiveRide.id)).rejects.toThrow(CapacityExceededError);

    // 4. Verify pool occupancy was not corrupted
    const recheckedPool = await prisma.pool.findUnique({ where: { id: pool!.id } });
    expect(recheckedPool!.occupiedSeats).toBeLessThanOrEqual(3);
  });
});
