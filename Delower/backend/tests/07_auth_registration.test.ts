// backend/tests/07_auth_registration.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth & Registration Integration Suite', () => {
  const testPassengerEmail = `test.passenger.${Date.now()}@dhakatesla.com`;
  const testDriverEmail = `test.driver.${Date.now()}@dhakatesla.com`;

  afterAll(async () => {
    // Clean up test users to prevent polluting other test suites
    await prisma.vehicle.deleteMany({
      where: { driver: { email: { in: [testPassengerEmail, testDriverEmail] } } },
    });
    await prisma.wallet.deleteMany({
      where: { user: { email: { in: [testPassengerEmail, testDriverEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testPassengerEmail, testDriverEmail] } },
    });
  });

  it('should register a new passenger with an initialized wallet', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Tania Ahmed',
        email: testPassengerEmail,
        password: 'password123',
        phone: '01711000001',
        role: 'PASSENGER',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.fullName).toBe('Tania Ahmed');
    expect(res.body.user.role).toBe('PASSENGER');
    expect(res.body.user.walletBalanceBdt).toBe('1000.00');

    // Verify DB wallet existence
    const userInDb = await prisma.user.findUnique({
      where: { email: testPassengerEmail },
      include: { wallet: true },
    });
    expect(userInDb).toBeDefined();
    expect(userInDb?.wallet?.balancePoysha).toBe(100000);
  });

  it('should register a new driver with an initialized wallet and 3-seat Tesla vehicle', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Karim Ullah',
        email: testDriverEmail,
        password: 'password123',
        phone: '01711000002',
        role: 'DRIVER',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('DRIVER');

    // Verify DB vehicle existence
    const driverInDb = await prisma.user.findUnique({
      where: { email: testDriverEmail },
      include: { vehicles: true, wallet: true },
    });
    expect(driverInDb?.vehicles.length).toBe(1);
    expect(driverInDb?.vehicles[0].capacity).toBe(3);
    expect(driverInDb?.vehicles[0].name).toBe('Bullet');
    expect(driverInDb?.wallet?.balancePoysha).toBe(100000);

    // Immediately delete the test vehicle to prevent cross-suite interference
    await prisma.vehicle.deleteMany({
      where: { driverId: driverInDb!.id },
    });
  });

  it('should reject registration with an existing email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate Tania',
        email: testPassengerEmail,
        password: 'password123',
        phone: '01711000003',
        role: 'PASSENGER',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });
});
