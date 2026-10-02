// backend/tests/04_tenant_isolation.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { signToken } from '../src/lib/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Invariant 4: Zero-Trust Tenant Privacy & Cross-User IDOR Isolation', () => {
  it("should prevent Nusrat from viewing or modifying Rafiq's ride request", async () => {
    // 1. Get Nusrat and Rafiq
    const nusrat = await prisma.user.findFirst({ where: { email: 'nusrat@dhakatesla.com' } });
    const rafiq = await prisma.user.findFirst({ where: { email: 'rafiq@dhakatesla.com' } });

    const nusratToken = signToken({
      userId: nusrat!.id,
      email: nusrat!.email,
      role: 'PASSENGER',
      fullName: nusrat!.fullName,
    });

    // 2. Create a ride belonging exclusively to Rafiq
    const rafiqRide = await prisma.rideRequest.create({
      data: {
        passengerId: rafiq!.id,
        pickupZone: 'Banani',
        destinationZone: 'Gulshan 1',
        requestedSeats: 1,
        status: 'REQUESTED',
      },
    });

    // 3. Nusrat attempts to GET Rafiq's ride -> Must return 403 Forbidden
    const getRes = await request(app)
      .get(`/api/rides/${rafiqRide.id}`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toBe('AccessDenied');

    // 4. Nusrat attempts to CANCEL Rafiq's ride -> Must return 403 Forbidden
    const cancelRes = await request(app)
      .post(`/api/rides/${rafiqRide.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(cancelRes.status).toBe(403);
  });
});
