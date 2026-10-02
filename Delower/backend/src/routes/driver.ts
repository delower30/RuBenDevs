// backend/src/routes/driver.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, TokenPayload } from '../lib/jwt';
import { isValidRideTransition, RideStatus } from '../lib/fsm';

const router = Router();
const prisma = new PrismaClient();

function requireDriver(req: Request, res: Response): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing token' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'DRIVER') {
    res.status(403).json({ error: 'Forbidden: Driver privileges required' });
    return null;
  }
  return payload;
}

// GET /api/driver/manifest (Jashim's 3-seat manifest and assigned passengers)
router.get('/manifest', async (req: Request, res: Response) => {
  const driver = requireDriver(req, res);
  if (!driver) return;

  const vehicle = await prisma.vehicle.findFirst({
    where: { driverId: driver.userId },
  });

  if (!vehicle) {
    return res.status(404).json({ error: 'No vehicle assigned to driver' });
  }

  // Fetch driver wallet for live balance
  const driverWallet = await prisma.wallet.findUnique({
    where: { userId: driver.userId },
  });

  // Fetch active pools for driver. Prune any duplicate zombie pools to enforce single-pool invariant.
  const activePools = await prisma.pool.findMany({
    where: {
      driverId: driver.userId,
      status: { in: ['OPEN', 'DISPATCHED', 'IN_TRANSIT'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: true,
      memberships: {
        include: {
          passenger: true,
          rideRequest: true,
        },
      },
    },
  });

  let pool = activePools[0];

  // Auto-close any duplicate legacy pools so only the newest physical pool is active
  if (activePools.length > 1) {
    const orphanIds = activePools.slice(1).map((p) => p.id);
    await prisma.pool.updateMany({
      where: { id: { in: orphanIds } },
      data: { status: 'CLOSED' },
    });
  }

  // If no open pool exists, auto-initialize an open pool for Jashim's Bullet
  if (!pool) {
    pool = await prisma.pool.create({
      data: {
        driverId: driver.userId,
        vehicleId: vehicle.id,
        currentZone: 'Banani',
        destinationZone: 'Mohakhali',
        maxCapacity: vehicle.capacity || 3,
        occupiedSeats: 0,
        status: 'OPEN',
      },
      include: {
        vehicle: true,
        memberships: {
          include: {
            passenger: true,
            rideRequest: true,
          },
        },
      },
    });
  }

  // Filter only ACTIVE memberships occupying physical vehicle seats
  const activeMemberships = (pool.memberships || []).filter((m) =>
    ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'].includes(m.rideRequest.status)
  );

  // Build the 3-seat telemetry array
  const seats = [];
  const maxSeats = vehicle.capacity; // Strictly 3
  let assignedCount = 0;

  for (const m of activeMemberships) {
    for (let s = 0; s < m.seatsAllocated; s++) {
      if (assignedCount < maxSeats) {
        seats.push({
          seatNumber: assignedCount + 1,
          status: 'OCCUPIED',
          passengerName: m.passenger.fullName,
          pickupZone: m.rideRequest.pickupZone,
          destinationZone: m.rideRequest.destinationZone,
          rideStatus: m.rideRequest.status,
          fareBdt: (m.fareChargedPoysha / (m.seatsAllocated || 1) / 100).toFixed(2),
          rideId: m.rideRequestId,
          allocatedSeats: m.seatsAllocated,
        });
        assignedCount++;
      }
    }
  }

  // Fill remaining seats as AVAILABLE
  while (seats.length < maxSeats) {
    seats.push({
      seatNumber: seats.length + 1,
      status: 'AVAILABLE',
      passengerName: null,
      pickupZone: null,
      destinationZone: null,
      rideStatus: null,
      fareBdt: null,
      rideId: null,
      allocatedSeats: 0,
    });
  }

  const realOccupancy = Math.min(maxSeats, assignedCount);

  return res.json({
    driverName: driver.fullName,
    driverWalletBalanceBdt: driverWallet
      ? (driverWallet.balancePoysha / 100).toFixed(2)
      : '1000.00',
    vehicle: {
      name: vehicle.name,
      model: vehicle.model,
      plate: vehicle.licensePlate,
      capacity: vehicle.capacity,
      isActive: vehicle.isActive,
    },
    pool: {
      id: pool.id,
      status: realOccupancy >= maxSeats ? 'DISPATCHED' : pool.status,
      currentZone: pool.currentZone,
      occupiedSeats: realOccupancy,
      maxCapacity: pool.maxCapacity,
      seats,
    },
  });
});

// POST /api/driver/reset-demo (Reset fleet, pools, and balances to clean PRD story state)
router.post('/reset-demo', async (req: Request, res: Response) => {
  try {
    await prisma.poolMembership.deleteMany({});
    await prisma.rideRequest.deleteMany({});
    await prisma.pool.deleteMany({});

    const jashim = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    const bullet = await prisma.vehicle.findFirst({ where: { driverId: jashim!.id } });

    if (jashim && bullet) {
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

    // Reset wallets back to 100,000 poysha (৳1,000.00)
    await prisma.wallet.updateMany({
      data: { balancePoysha: 100000 },
    });

    return res.json({
      message: 'Dhaka Tesla Fleet and Wallets reset to pristine demo state!',
      success: true,
    });
  } catch (err: any) {
    console.error('Reset demo error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/toggle-online
router.post('/toggle-online', async (req: Request, res: Response) => {
  const driver = requireDriver(req, res);
  if (!driver) return;

  const vehicle = await prisma.vehicle.findFirst({
    where: { driverId: driver.userId },
  });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { isActive: !vehicle.isActive },
  });

  return res.json({
    message: `Driver status toggled to ${updated.isActive ? 'ONLINE' : 'OFFLINE'}`,
    isOnline: updated.isActive,
  });
});

// POST /api/driver/rides/:id/transition (Driver FSM transition: DRIVER_ARRIVED -> STARTED -> COMPLETED)
router.post('/rides/:id/transition', async (req: Request, res: Response) => {
  const driver = requireDriver(req, res);
  if (!driver) return;

  const { id } = req.params;
  const { targetState } = req.body as { targetState: RideStatus };

  if (!targetState) {
    return res.status(400).json({ error: 'targetState is required' });
  }

  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: {
      membership: {
        include: { pool: true },
      },
    },
  });

  if (!ride) {
    return res.status(404).json({ error: 'Ride request not found' });
  }

  const currentStatus = ride.status as RideStatus;

  // Strict FSM Validation (PRD §3 & §12)
  if (!isValidRideTransition(currentStatus, targetState)) {
    return res.status(409).json({
      error: 'InvalidStateTransition',
      message: `Invalid state transition: Cannot transition ride from ${currentStatus} to ${targetState}`,
      currentStatus,
      targetState,
    });
  }

  // Execute transition atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update ride status
    const updatedRide = await tx.rideRequest.update({
      where: { id },
      data: { status: targetState },
    });

    // 2. If COMPLETED, process simulated TeslaPay wallet debit & driver payout!
    if (targetState === 'COMPLETED') {
      const passengerWallet = await tx.wallet.findUnique({
        where: { userId: ride.passengerId },
      });
      const driverWallet = await tx.wallet.findUnique({
        where: { userId: driver.userId },
      });

      if (passengerWallet && driverWallet) {
        // Debit passenger
        await tx.wallet.update({
          where: { id: passengerWallet.id },
          data: {
            balancePoysha: Math.max(0, passengerWallet.balancePoysha - ride.totalFarePoysha),
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: passengerWallet.id,
            rideRequestId: ride.id,
            amountPoysha: -ride.totalFarePoysha,
            transactionType: 'RIDE_PAYMENT',
            description: `Payment for ride to ${ride.destinationZone}`,
          },
        });

        // Credit driver
        await tx.wallet.update({
          where: { id: driverWallet.id },
          data: {
            balancePoysha: driverWallet.balancePoysha + ride.totalFarePoysha,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: driverWallet.id,
            rideRequestId: ride.id,
            amountPoysha: ride.totalFarePoysha,
            transactionType: 'DRIVER_PAYOUT',
            description: `Driver payout from passenger ${ride.passengerId}`,
          },
        });
      }

      // Free occupied seat in pool and update pilot's location to the drop-off destination
      if (ride.membership?.pool) {
        const pool = ride.membership.pool;
        const newOccupancy = Math.max(0, pool.occupiedSeats - ride.membership.seatsAllocated);
        await tx.pool.update({
          where: { id: pool.id },
          data: {
            occupiedSeats: newOccupancy,
            currentZone: ride.destinationZone, // Physical arrival at drop-off hub
            status: newOccupancy === 0 ? 'OPEN' : pool.status,
          },
        });
      }
    }

    // 3. Log audit event
    await tx.auditEvent.create({
      data: {
        entityName: 'RIDE_REQUEST',
        entityId: ride.id,
        actorId: driver.userId,
        eventType: 'STATUS_TRANSITION',
        previousState: currentStatus,
        newState: targetState,
      },
    });

    return updatedRide;
  });

  return res.json({
    message: `Ride successfully transitioned to ${targetState}`,
    ride: result,
  });
});

// POST /api/driver/reposition (Allows driver to change staging hub when vehicle is idle)
router.post('/reposition', async (req: Request, res: Response) => {
  const driver = requireDriver(req, res);
  if (!driver) return;

  const { zone } = req.body as { zone: string };
  if (!zone) {
    return res.status(400).json({ error: 'zone is required' });
  }

  const pool = await prisma.pool.findFirst({
    where: { driverId: driver.userId, status: { in: ['OPEN', 'DISPATCHED'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (!pool) {
    return res.status(404).json({ error: 'No active pool found' });
  }

  if (pool.occupiedSeats > 0) {
    return res.status(400).json({ error: 'Cannot reposition vehicle while passengers are onboard' });
  }

  const updated = await prisma.pool.update({
    where: { id: pool.id },
    data: { currentZone: zone },
  });

  return res.json({
    message: `Bullet repositioned to ${zone}`,
    currentZone: updated.currentZone,
  });
});

export default router;
