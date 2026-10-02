// backend/src/routes/rides.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, TokenPayload } from '../lib/jwt';
import { calculateFare, DHAKA_ZONES } from '../lib/pricing';
import { matchRideIntoPool, cancelRideRequest, CapacityExceededError } from '../services/poolService';

const router = Router();
const prisma = new PrismaClient();

// Auth Middleware Helper
function authenticate(req: Request, res: Response): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing authorization token' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    return null;
  }
  return payload;
}

// POST /api/rides/quote (Fare estimate before booking)
router.post('/quote', async (req: Request, res: Response) => {
  const { pickupZone, destinationZone, requestedSeats = 1 } = req.body;

  if (!pickupZone || !destinationZone) {
    return res.status(400).json({ error: 'pickupZone and destinationZone are required' });
  }

  const soloFare = calculateFare(pickupZone, destinationZone, false, requestedSeats);
  const pooledFare = calculateFare(pickupZone, destinationZone, true, requestedSeats);

  return res.json({
    pickupZone,
    destinationZone,
    requestedSeats,
    solo: soloFare,
    pooled: pooledFare,
  });
});

// GET /api/rides/fleet-status - Live physical stationing & seat availability of Dhaka Tesla fleet
router.get('/fleet-status', async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { isActive: true },
      include: {
        driver: true,
        pools: {
          where: { status: { in: ['OPEN', 'DISPATCHED', 'IN_TRANSIT'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      return res.json({
        isOnline: false,
        vehicleName: 'Bullet',
        pilotName: 'Pilot Jashim',
        currentZone: 'Offline',
        occupiedSeats: 0,
        availableSeats: 0,
        maxCapacity: 3,
      });
    }

    const activePool = vehicle.pools[0];
    const currentZone = activePool?.currentZone || 'Banani';
    const occupied = activePool ? activePool.occupiedSeats : 0;
    const availableSeats = Math.max(0, (vehicle.capacity || 3) - occupied);

    return res.json({
      isOnline: vehicle.isActive,
      vehicleName: vehicle.name,
      pilotName: vehicle.driver?.fullName || 'Pilot Jashim',
      currentZone,
      occupiedSeats: occupied,
      availableSeats,
      maxCapacity: vehicle.capacity || 3,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/rides (Book a ride request)
router.post('/', async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;

  const { pickupZone, destinationZone, requestedSeats = 1 } = req.body;
  const idempotencyKey = (req.headers['idempotency-key'] as string) || null;

  // Validation
  if (!pickupZone || !destinationZone) {
    return res.status(400).json({ error: 'pickupZone and destinationZone are required' });
  }

  if (requestedSeats < 1 || requestedSeats > 3) {
    return res.status(400).json({ error: 'requestedSeats must be between 1 and 3' });
  }

  try {
    // Idempotency check (defense against network retries on poor mobile data)
    if (idempotencyKey) {
      const existing = await prisma.rideRequest.findUnique({
        where: { idempotencyKey },
        include: { membership: { include: { pool: { include: { vehicle: true, driver: true } } } } },
      });
      if (existing) {
        return res.json(existing);
      }
    }

    // Baseline solo fare calculation
    const fare = calculateFare(pickupZone, destinationZone, false, requestedSeats);

    // Create ride request
    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: user.userId,
        pickupZone,
        destinationZone,
        requestedSeats,
        baseFarePoysha: fare.baseFarePoysha,
        distanceFarePoysha: fare.distanceFarePoysha,
        discountPoysha: 0,
        totalFarePoysha: fare.totalFarePoysha,
        status: 'REQUESTED',
        idempotencyKey,
      },
    });

    // Attempt automated match into Bullet/Pool
    try {
      const matchResult = await matchRideIntoPool(ride.id);
      return res.status(201).json({
        message: 'Ride requested and successfully matched into Tesla pool!',
        rideId: ride.id,
        status: 'MATCHED',
        match: matchResult,
      });
    } catch (matchErr: any) {
      // Clean up the rejected ride request so no ghost booking lingers in DB
      await prisma.rideRequest.delete({ where: { id: ride.id } }).catch(() => {});
      if (matchErr instanceof CapacityExceededError) {
        return res.status(409).json({
          error: 'CapacityExceededError',
          message: matchErr.message,
          status: 'REJECTED',
        });
      }
      throw matchErr;
    }
  } catch (error: any) {
    console.error('Ride booking error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/rides/me/active (and /active) - Retrieve current authenticated passenger's active trip
router.get(['/me/active', '/active'], async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;

  const activeRide = await prisma.rideRequest.findFirst({
    where: {
      passengerId: user.userId,
      status: { in: ['MATCHED', 'DRIVER_ARRIVED', 'STARTED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      membership: {
        include: {
          pool: {
            include: {
              driver: true,
              vehicle: true,
              memberships: true,
            },
          },
        },
      },
    },
  });

  if (!activeRide) {
    return res.json({ activeRide: null });
  }

  const pool = activeRide.membership?.pool;
  return res.json({
    activeRide: {
      id: activeRide.id,
      status: activeRide.status,
      pickupZone: activeRide.pickupZone,
      destinationZone: activeRide.destinationZone,
      seats: activeRide.requestedSeats,
      fare: {
        baseFareBdt: (activeRide.baseFarePoysha / 100).toFixed(2),
        distanceFareBdt: (activeRide.distanceFarePoysha / 100).toFixed(2),
        discountBdt: (activeRide.discountPoysha / 100).toFixed(2),
        totalFareBdt: (activeRide.totalFarePoysha / 100).toFixed(2),
        totalPoysha: activeRide.totalFarePoysha,
      },
      pool: pool
        ? {
            isShared: (pool.memberships?.length ?? 0) > 1,
            driverName: pool.driver.fullName,
            vehicleName: pool.vehicle.name,
            vehicleModel: pool.vehicle.model,
            occupiedSeats: pool.occupiedSeats,
            maxCapacity: pool.maxCapacity,
            coPassengersCount: Math.max(0, (pool.memberships?.length ?? 1) - 1),
          }
        : null,
      createdAt: activeRide.createdAt,
    },
  });
});

// GET /api/rides/:id (Tenant privacy view: Nusrat sees only her own fare & status)
router.get('/:id', async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;

  const { id } = req.params;

  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: {
      passenger: true,
      membership: {
        include: {
          pool: {
            include: {
              driver: true,
              vehicle: true,
              memberships: true,
            },
          },
        },
      },
    },
  });

  if (!ride) {
    return res.status(404).json({ error: 'Ride request not found' });
  }

  // IDOR & Privacy Guard: Only ride owner or assigned driver can view ride
  const isOwner = ride.passengerId === user.userId;
  const isAssignedDriver = ride.membership?.pool?.driverId === user.userId;

  if (!isOwner && !isAssignedDriver) {
    return res.status(403).json({
      error: 'AccessDenied',
      message: 'You are not authorized to view this passenger ride.',
    });
  }

  // Sanitized view: Omit other passengers' personal data and fares
  const pool = ride.membership?.pool;
  return res.json({
    id: ride.id,
    status: ride.status,
    pickupZone: ride.pickupZone,
    destinationZone: ride.destinationZone,
    seats: ride.requestedSeats,
    fare: {
      baseFareBdt: (ride.baseFarePoysha / 100).toFixed(2),
      distanceFareBdt: (ride.distanceFarePoysha / 100).toFixed(2),
      discountBdt: (ride.discountPoysha / 100).toFixed(2),
      totalFareBdt: (ride.totalFarePoysha / 100).toFixed(2),
      totalPoysha: ride.totalFarePoysha,
    },
    pool: pool
      ? {
          isShared: (pool.memberships?.length ?? 0) > 1,
          driverName: pool.driver.fullName,
          vehicleName: pool.vehicle.name,
          vehicleModel: pool.vehicle.model,
          occupiedSeats: pool.occupiedSeats,
          maxCapacity: pool.maxCapacity,
          coPassengersCount: Math.max(0, (pool.memberships?.length ?? 1) - 1),
        }
      : null,
    createdAt: ride.createdAt,
  });
});

// POST /api/rides/:id/cancel
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const user = authenticate(req, res);
  if (!user) return;

  const { id } = req.params;

  const ride = await prisma.rideRequest.findUnique({ where: { id } });
  if (!ride) {
    return res.status(404).json({ error: 'Ride request not found' });
  }

  // IDOR check: Only owner can cancel
  if (ride.passengerId !== user.userId) {
    return res.status(403).json({ error: 'Forbidden: You cannot cancel another user ride' });
  }

  try {
    const cancelled = await cancelRideRequest(id, user.userId);
    return res.json({
      message: 'Ride cancelled successfully. Seats restored to Bullet.',
      ride: cancelled,
    });
  } catch (err: any) {
    return res.status(409).json({ error: err.name, message: err.message });
  }
});

export default router;
