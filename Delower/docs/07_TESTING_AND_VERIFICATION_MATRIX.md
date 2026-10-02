# Module 07: Testing & Verification Matrix (Critical Business Invariants)

**Project:** Dhaka Tesla Pool  
**Author:** Software Architect & Principal Quality Engineer  
**Mandate:** Meaningful, High-Value Verification (PRD §12 - "No Coverage-Chasing")  

---

## 1. Testing Philosophy & Test Suite Architecture

The PRD explicitly emphasizes that testing must be **meaningful**, not merely chasing superficial lines-of-code coverage percentages:
> *"Testing (meaningful, not coverage-chasing) should cover: Bullet's capacity can never be exceeded; invalid state transitions are rejected; Nusrat's and Rafiq's pooled fares calculate correctly; users can't modify another user's ride; cancellation rules hold; two concurrent requests can't corrupt pool capacity."*

Our test suite uses **Vitest** paired with **Supertest** running against an isolated PostgreSQL database to validate transactions and constraints end-to-end.

```
tests/
├── 01_capacity_limit.test.ts        # Invariant 1: Bullet 3-seat limit
├── 02_state_transitions.test.ts    # Invariant 2: FSM transition legality
├── 03_fare_calculation.test.ts     # Invariant 3: Nusrat & Rafiq poysha split
├── 04_tenant_isolation.test.ts     # Invariant 4: Cross-user ride mutation block
├── 05_cancellation_rules.test.ts   # Invariant 5: Cancellation & seat release
└── 06_concurrency_race.test.ts     # Invariant 6: 10-thread last seat race
```

---

## 2. The 6 Critical Invariant Test Specifications

### Invariant 1: Bullet's Capacity Can Never Be Exceeded
- **Requirement:** A 3-seat vehicle must reject any booking that would cause total allocated seats to reach 4 or higher.
- **Test Implementation:**
```typescript
describe('Invariant 1: Vehicle Capacity Enforcement', () => {
  it("should reject booking when Bullet's 3-seat limit is reached", async () => {
    const pool = await createTestPool({ vehicleCapacity: 3, occupiedSeats: 2 });

    // Attempt to book 2 additional seats (2 + 2 = 4 > 3)
    const response = await request(app)
      .post('/api/pools/match')
      .set('Authorization', `Bearer ${shirinToken}`)
      .send({ poolId: pool.id, requestedSeats: 2 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('CapacityExceededError');

    // Confirm database state was NOT mutated
    const updatedPool = await db('pools').where({ id: pool.id }).first();
    expect(updatedPool.occupied_seats).toBe(2);
  });
});
```

---

### Invariant 2: Invalid State Transitions Are Rejected
- **Requirement:** State changes must follow the strict FSM graph. Skipping states or moving backward is rejected with `409 Conflict`.
- **Test Implementation:**
```typescript
describe('Invariant 2: Finite State Machine Transition Integrity', () => {
  it('should reject transitioning REQUESTED directly to COMPLETED', async () => {
    const ride = await createTestRide({ status: 'REQUESTED' });

    const response = await request(app)
      .post(`/api/driver/rides/${ride.id}/transition`)
      .set('Authorization', `Bearer ${jashimDriverToken}`)
      .send({ targetState: 'COMPLETED' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/InvalidStateTransition/i);

    const checkRide = await db('ride_requests').where({ id: ride.id }).first();
    expect(checkRide.status).toBe('REQUESTED');
  });
});
```

---

### Invariant 3: Nusrat & Rafiq Pooled Fares Calculate Correctly
- **Requirement:** Integer poysha calculations must match hand-verified figures down to the exact poysha.
  - Nusrat (Solo ৳75.00 $\rightarrow$ 25% pool discount $\rightarrow$ ৳56.25 = `5625 poysha`).
  - Rafiq (Solo ৳67.50 $\rightarrow$ 25% pool discount $\rightarrow$ ৳50.63 = `5063 poysha`).
- **Test Implementation:**
```typescript
describe('Invariant 3: Fare Calculation & Pooling Discounts', () => {
  it('should compute exact integer poysha fares for Nusrat and Rafiq', async () => {
    // 1. Nusrat Banani -> Mohakhali (3.0 km)
    const nusratFare = calculateFare({ distanceKm: 3.0, isPooled: false });
    expect(nusratFare.totalPoysha).toBe(7500); // ৳75.00

    // 2. Rafiq Banani -> Gulshan 1 (2.5 km)
    const rafiqFare = calculateFare({ distanceKm: 2.5, isPooled: false });
    expect(rafiqFare.totalPoysha).toBe(6750); // ৳67.50

    // 3. Pool Activated (25% Discount applied)
    const pooledNusrat = applyPoolDiscount(7500, 25);
    const pooledRafiq = applyPoolDiscount(6750, 25);

    expect(pooledNusrat.discountPoysha).toBe(1875);
    expect(pooledNusrat.finalFarePoysha).toBe(5625); // ৳56.25

    expect(pooledRafiq.discountPoysha).toBe(1687);
    expect(pooledRafiq.finalFarePoysha).toBe(5063); // ৳50.63
  });
});
```

---

### Invariant 4: Cross-User Ride Mutation & Privacy Leakage Blocked
- **Requirement:** Users can neither inspect nor cancel rides belonging to someone else.
- **Test Implementation:**
```typescript
describe('Invariant 4: Tenant Isolation & Authorization Guard', () => {
  it('should prevent Nusrat from reading or cancelling Rafiq ride', async () => {
    const rafiqRide = await createTestRide({ passengerId: rafiqUser.id });

    // Nusrat attempts to GET Rafiq's ride
    const getRes = await request(app)
      .get(`/api/rides/${rafiqRide.id}`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(getRes.status).toBe(403);

    // Nusrat attempts to CANCEL Rafiq's ride
    const cancelRes = await request(app)
      .post(`/api/rides/${rafiqRide.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(cancelRes.status).toBe(403);
  });
});
```

---

### Invariant 5: Cancellation Rules & Capacity Restoration Hold
- **Requirement:** A passenger can cancel while status is `REQUESTED` or `MATCHED`. Cancelling frees up their occupied seat in the pool. Cancelling after `STARTED` is blocked.
- **Test Implementation:**
```typescript
describe('Invariant 5: Cancellation Lifecycle & Seat Restoration', () => {
  it('should restore pool seat when passenger cancels before trip start', async () => {
    const pool = await createTestPool({ vehicleCapacity: 3, occupiedSeats: 2 });
    const ride = await createTestMembership(pool.id, nusratUser.id, 1, 'MATCHED');

    // Nusrat cancels her matched ride
    const res = await request(app)
      .post(`/api/rides/${ride.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(200);

    // Pool seat count must decrease from 2 down to 1
    const updatedPool = await db('pools').where({ id: pool.id }).first();
    expect(updatedPool.occupied_seats).toBe(1);
  });

  it('should reject cancellation once trip is STARTED', async () => {
    const ride = await createTestRide({ status: 'STARTED', passengerId: nusratUser.id });

    const res = await request(app)
      .post(`/api/rides/${ride.id}/cancel`)
      .set('Authorization', `Bearer ${nusratToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/TripAlreadyStarted/i);
  });
});
```

---

### Invariant 6: Concurrency Race Condition Defense (The Last-Seat Race)
- **Requirement:** Bullet has 1 seat left. 10 simultaneous asynchronous requests arrive at the exact same millisecond. Exactly 1 request must win; 9 requests must be cleanly rejected with `409 Conflict`; vehicle occupancy must never exceed 3.
- **Test Implementation:**
```typescript
describe('Invariant 6: High-Concurrency Seat Allocation', () => {
  it('should handle simultaneous bookings without corrupting pool capacity', async () => {
    // Bullet starts with 2 occupied seats, max 3 (1 seat remaining)
    const pool = await createTestPool({ vehicleCapacity: 3, occupiedSeats: 2 });

    // Spawn 10 concurrent requests claiming 1 seat each
    const contenders = Array.from({ length: 10 }, (_, i) => ({
      userId: `contender-${i}`,
      token: generateToken(`contender-${i}`, 'PASSENGER')
    }));

    const results = await Promise.allSettled(
      contenders.map(c =>
        request(app)
          .post('/api/pools/match')
          .set('Authorization', `Bearer ${c.token}`)
          .send({ poolId: pool.id, requestedSeats: 1 })
      )
    );

    // Count HTTP status codes
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 200
    ).length;
    const conflictCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 409
    ).length;

    // Exactly 1 winner, exactly 9 losers
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);

    // Verify database constraint: Occupied seats must equal exactly 3
    const finalPool = await db('pools').where({ id: pool.id }).first();
    expect(finalPool.occupied_seats).toBe(3);
  });
});
```

---

## 3. Running the Test Suite

```bash
# Run all invariant test suites inside Docker
docker compose exec api npm run test

# Run specifically the high-concurrency race condition suite
docker compose exec api npm run test:concurrency
```
