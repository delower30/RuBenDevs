// backend/tests/03_fare_calculation.test.ts
import { describe, it, expect } from 'vitest';
import { calculateFare, ZONE_DISTANCES } from '../src/lib/pricing';

describe('Invariant 3: Deterministic Integer Poysha Fare Calculations', () => {
  it('should calculate exact hand-verified integer poysha fares for Nusrat and Rafiq', () => {
    // 1. Nusrat Banani -> Mohakhali (3.0 km) Solo
    const nusratSolo = calculateFare('Banani', 'Mohakhali', false);
    expect(nusratSolo.distanceKm).toBe(3.0);
    expect(nusratSolo.baseFarePoysha).toBe(3000); // ৳30.00
    expect(nusratSolo.distanceFarePoysha).toBe(4500); // ৳45.00
    expect(nusratSolo.subtotalPoysha).toBe(7500);
    expect(nusratSolo.totalFarePoysha).toBe(7500); // ৳75.00
    expect(nusratSolo.formatted.totalFareBdt).toBe('75.00');

    // 2. Nusrat Pooled (25% Discount)
    const nusratPooled = calculateFare('Banani', 'Mohakhali', true);
    expect(nusratPooled.discountPoysha).toBe(1875); // 7500 * 0.25 = 1875 poysha
    expect(nusratPooled.totalFarePoysha).toBe(5625); // 7500 - 1875 = 5625 poysha
    expect(nusratPooled.formatted.totalFareBdt).toBe('56.25');

    // 3. Rafiq Banani -> Gulshan 1 (2.5 km) Solo
    const rafiqSolo = calculateFare('Banani', 'Gulshan 1', false);
    expect(rafiqSolo.distanceKm).toBe(2.5);
    expect(rafiqSolo.baseFarePoysha).toBe(3000);
    expect(rafiqSolo.distanceFarePoysha).toBe(3750); // 2.5 * 1500 = 3750 poysha
    expect(rafiqSolo.totalFarePoysha).toBe(6750); // ৳67.50
    expect(rafiqSolo.formatted.totalFareBdt).toBe('67.50');

    // 4. Rafiq Pooled (25% Discount)
    const rafiqPooled = calculateFare('Banani', 'Gulshan 1', true);
    expect(rafiqPooled.discountPoysha).toBe(1687); // Math.floor(6750 * 0.25)
    expect(rafiqPooled.totalFarePoysha).toBe(5063); // 6750 - 1687 = 5063 poysha
    expect(rafiqPooled.formatted.totalFareBdt).toBe('50.63');

    // 5. Driver Gross Combined Payout
    const driverGross = nusratPooled.totalFarePoysha + rafiqPooled.totalFarePoysha;
    expect(driverGross).toBe(10688); // ৳106.88
  });
});
