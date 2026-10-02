// backend/tests/02_state_transitions.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { signToken } from '../src/lib/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Invariant 2: FSM Transition Matrix & Conflict Rejection', () => {
  it('should reject invalid transition from REQUESTED directly to COMPLETED with 409 Conflict', async () => {
    // 1. Get Jashim the driver
    const jashim = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    const driverToken = signToken({
      userId: jashim!.id,
      email: jashim!.email,
      role: 'DRIVER',
      fullName: jashim!.fullName,
    });

    // 2. Create a ride in REQUESTED state
    const nusrat = await prisma.user.findFirst({ where: { email: 'nusrat@dhakatesla.com' } });
    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: nusrat!.id,
        pickupZone: 'Banani',
        destinationZone: 'Mohakhali',
        requestedSeats: 1,
        status: 'REQUESTED',
      },
    });

    // 3. Driver attempts to mark REQUESTED directly as COMPLETED (skipping MATCHED, ARRIVED, STARTED)
    const res = await request(app)
      .post(`/api/driver/rides/${ride.id}/transition`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ targetState: 'COMPLETED' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('InvalidStateTransition');

    // 4. Verify ride status remained unchanged
    const verifiedRide = await prisma.rideRequest.findUnique({ where: { id: ride.id } });
    expect(verifiedRide!.status).toBe('REQUESTED');
  });
});
