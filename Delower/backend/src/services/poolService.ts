// backend/src/services/poolService.ts
import { PrismaClient } from '@prisma/client';
import { calculateFare, isRouteCompatible, PRICING_CONFIG } from '../lib/pricing';

const prisma = new PrismaClient();

export class CapacityExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapacityExceededError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Attempts to match a ride request into an existing active pool or create a new pool dispatch.
 * Enforces the strict 3-seat Bullet physical capacity limit inside an atomic transaction.
 */
export async function matchRideIntoPool(rideRequestId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the ride request
    const ride = await tx.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: { passenger: true },
    });

    if (!ride) {
      throw new Error('Ride request not found');
    }

    if (ride.status !== 'REQUESTED') {
      throw new InvalidStateTransitionError(`Ride is in status ${ride.status}, cannot match`);
    }

    // 2. Find eligible active pool (e.g. Jashim's Bullet)
    const pools = await tx.pool.findMany({
      where: {
        status: { in: ['OPEN', 'DISPATCHED'] },
        currentZone: ride.pickupZone,
        vehicle: { isActive: true },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        memberships: {
          include: { rideRequest: true },
        },
      },
    });

    let targetPool = null;

    for (const p of pools) {
      const activeMemberships = p.memberships.filter((m) =>
        ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(m.rideRequest.status)
      );
      const activeSeats = Math.max(
        p.occupiedSeats,
        activeMemberships.reduce((sum, m) => sum + m.seatsAllocated, 0)
      );
      const remainingSeats = p.maxCapacity - activeSeats;

      if (remainingSeats >= ride.requestedSeats) {
        // Check route compatibility if pool already has members
        if (activeMemberships.length > 0) {
          const firstMemberRide = activeMemberships[0].rideRequest;
          if (
            isRouteCompatible(
              firstMemberRide.pickupZone,
              firstMemberRide.destinationZone,
              ride.pickupZone,
              ride.destinationZone
            )
          ) {
            targetPool = p;
            break;
          }
        } else {
          targetPool = p;
          break;
        }
      }
    }

    // 3. Strict Geographic Matching: If no compatible pool in this pickup zone
    if (!targetPool) {
      // Check if there are ANY pools in the database
      const existingPoolCount = await tx.pool.count();

      // If zero pools exist at all in DB, allow creating the first initial pool for active driver
      if (existingPoolCount === 0) {
        const driverVehicle = await tx.vehicle.findFirst({
          where: { isActive: true },
          include: { driver: true },
        });

        if (driverVehicle) {
          targetPool = await tx.pool.create({
            data: {
              vehicleId: driverVehicle.id,
              driverId: driverVehicle.driverId,
              currentZone: ride.pickupZone,
              destinationZone: ride.destinationZone,
              maxCapacity: driverVehicle.capacity,
              occupiedSeats: 0,
              status: 'OPEN',
            },
            include: {
              vehicle: true,
              memberships: { include: { rideRequest: true } },
            },
          });
        }
      }
    }

    // If still no pool in passenger's pickup zone, reject with real-time location feedback!
    if (!targetPool) {
      const activeVehicle = await tx.vehicle.findFirst({
        where: { isActive: true },
        include: {
          pools: {
            where: { status: { in: ['OPEN', 'DISPATCHED', 'IN_TRANSIT'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!activeVehicle) {
        throw new CapacityExceededError('Pilot Jashim (Bullet) is currently offline.');
      }

      const activePool = activeVehicle.pools[0];
      const driverLocation = activePool?.currentZone;

      if (driverLocation && driverLocation !== ride.pickupZone) {
        throw new CapacityExceededError(
          `No Tesla available in ${ride.pickupZone}. Bullet is currently stationed at ${driverLocation}.`
        );
      }

      throw new CapacityExceededError(
        `All Tesla vehicles in ${ride.pickupZone} are currently at full capacity (3/3 seats occupied).`
      );
    }

    // 4. ATOMIC CAPACITY CHECK (Bullet Capacity Invariant)
    const currentActiveMembers = targetPool.memberships.filter((m) =>
      ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(m.rideRequest.status)
    );
    const currentActiveSeats = Math.max(
      targetPool.occupiedSeats,
      currentActiveMembers.reduce((sum, m) => sum + m.seatsAllocated, 0)
    );
    const availableSeats = targetPool.maxCapacity - currentActiveSeats;

    if (availableSeats < ride.requestedSeats) {
      throw new CapacityExceededError(
        `Bullet capacity exceeded: Requested ${ride.requestedSeats} seats, only ${availableSeats} available (Max: ${targetPool.maxCapacity})`
      );
    }

    // 5. Calculate fare with 25% pool discount applied
    const isPooled = currentActiveMembers.length >= 1 || currentActiveSeats > 0;
    const fare = calculateFare(ride.pickupZone, ride.destinationZone, isPooled, ride.requestedSeats);

    // 6. Atomically update pool occupancy and attach membership
    const updatedOccupancy = currentActiveSeats + ride.requestedSeats;
    await tx.pool.update({
      where: { id: targetPool.id },
      data: {
        occupiedSeats: updatedOccupancy,
        status: updatedOccupancy >= targetPool.maxCapacity ? 'DISPATCHED' : 'OPEN',
      },
    });

    const membership = await tx.poolMembership.create({
      data: {
        poolId: targetPool.id,
        rideRequestId: ride.id,
        passengerId: ride.passengerId,
        seatsAllocated: ride.requestedSeats,
        fareChargedPoysha: fare.totalFarePoysha,
      },
    });

    // 7. Update the ride request status to MATCHED and save calculated fares
    const updatedRide = await tx.rideRequest.update({
      where: { id: ride.id },
      data: {
        status: 'MATCHED',
        baseFarePoysha: fare.baseFarePoysha,
        distanceFarePoysha: fare.distanceFarePoysha,
        discountPoysha: fare.discountPoysha,
        totalFarePoysha: fare.totalFarePoysha,
      },
    });

    // 8. If pool now has multiple members, apply discount retrospectively to existing members!
    if (targetPool.memberships.length >= 1) {
      for (const existingMember of targetPool.memberships) {
        const memberRide = existingMember.rideRequest;
        const memberFare = calculateFare(memberRide.pickupZone, memberRide.destinationZone, true, existingMember.seatsAllocated);

        await tx.rideRequest.update({
          where: { id: memberRide.id },
          data: {
            discountPoysha: memberFare.discountPoysha,
            totalFarePoysha: memberFare.totalFarePoysha,
          },
        });

        await tx.poolMembership.update({
          where: { id: existingMember.id },
          data: {
            fareChargedPoysha: memberFare.totalFarePoysha,
          },
        });
      }
    }

    // 9. Write immutable audit log
    await tx.auditEvent.create({
      data: {
        entityName: 'POOL',
        entityId: targetPool.id,
        actorId: ride.passengerId,
        eventType: 'MATCH_CONFIRMED',
        previousState: targetPool.status,
        newState: updatedOccupancy >= targetPool.maxCapacity ? 'DISPATCHED' : 'OPEN',
        metadata: JSON.stringify({
          rideId: ride.id,
          passenger: ride.passenger.fullName,
          seatsAllocated: ride.requestedSeats,
          finalOccupancy: updatedOccupancy,
          farePoysha: fare.totalFarePoysha,
        }),
      },
    });

    return {
      poolId: targetPool.id,
      rideId: updatedRide.id,
      seatsAllocated: ride.requestedSeats,
      fare,
      occupiedSeats: updatedOccupancy,
      maxCapacity: targetPool.maxCapacity,
    };
  });
}

/**
 * Cancels a ride request and releases allocated seats back into Bullet's pool.
 */
export async function cancelRideRequest(rideId: string, actorId: string) {
  return await prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({
      where: { id: rideId },
      include: { membership: true },
    });

    if (!ride) {
      throw new Error('Ride request not found');
    }

    if (ride.status === 'STARTED' || ride.status === 'COMPLETED') {
      throw new InvalidStateTransitionError(`Cannot cancel a trip that is already ${ride.status}`);
    }

    // Release pool seat
    if (ride.membership) {
      const pool = await tx.pool.findUnique({ where: { id: ride.membership.poolId } });
      if (pool) {
        const newOccupancy = Math.max(0, pool.occupiedSeats - ride.membership.seatsAllocated);
        await tx.pool.update({
          where: { id: pool.id },
          data: {
            occupiedSeats: newOccupancy,
            status: 'OPEN',
          },
        });
      }

      await tx.poolMembership.delete({
        where: { id: ride.membership.id },
      });
    }

    const cancelledRide = await tx.rideRequest.update({
      where: { id: ride.id },
      data: { status: 'CANCELLED' },
    });

    await tx.auditEvent.create({
      data: {
        entityName: 'RIDE_REQUEST',
        entityId: ride.id,
        actorId,
        eventType: 'RIDE_CANCELLED',
        previousState: ride.status,
        newState: 'CANCELLED',
      },
    });

    return cancelledRide;
  });
}
