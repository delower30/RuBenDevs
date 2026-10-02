// backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/jwt';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phone, role = 'PASSENGER' } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ error: 'fullName, email, password, and phone are required' });
    }

    const normalizedRole = role.toUpperCase() === 'DRIVER' ? 'DRIVER' : 'PASSENGER';

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Atomically create user, wallet (100,000 poysha / ৳1,000), and vehicle if driver
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          phone,
          role: normalizedRole,
        },
      });

      // Default wallet with ৳1,000 (100,000 poysha)
      await tx.wallet.create({
        data: {
          userId: user.id,
          balancePoysha: 100000,
          currency: 'BDT',
        },
      });

      // If Driver, create assigned 3-seat electric Tesla vehicle
      if (normalizedRole === 'DRIVER') {
        const randomPlateNum = Math.floor(1000 + Math.random() * 9000);
        await tx.vehicle.create({
          data: {
            driverId: user.id,
            name: 'Bullet',
            model: 'Electric Rickshaw Tesla (3-Wheeler)',
            licensePlate: `DHAKA-METRO-HA-11-${randomPlateNum}`,
            capacity: 3,
            isActive: true,
          },
        });
      }

      return user;
    });

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as any,
      fullName: newUser.fullName,
    });

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        walletBalancePoysha: 100000,
        walletBalanceBdt: '1000.00',
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      fullName: user.fullName,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalancePoysha: user.wallet?.balancePoysha ?? 0,
        walletBalanceBdt: ((user.wallet?.balancePoysha ?? 0) / 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { wallet: true, vehicles: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      walletBalanceBdt: ((user.wallet?.balancePoysha ?? 0) / 100).toFixed(2),
      vehicle: user.vehicles[0] ?? null,
    },
  });
});

export default router;
