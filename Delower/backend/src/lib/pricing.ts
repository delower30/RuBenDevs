// backend/src/lib/pricing.ts
// Mathematical Fare Engine & Dhaka Topological Zone Distance Matrix

export interface DhakaZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const DHAKA_ZONES: Record<string, DhakaZone> = {
  Banani: { id: 'Z_BAN', name: 'Banani', lat: 23.7937, lng: 90.4066 },
  'Gulshan 1': { id: 'Z_GUL1', name: 'Gulshan 1', lat: 23.7785, lng: 90.4184 },
  'Gulshan 2': { id: 'Z_GUL2', name: 'Gulshan 2', lat: 23.7949, lng: 90.4143 },
  Mohakhali: { id: 'Z_MOH', name: 'Mohakhali', lat: 23.7776, lng: 90.4054 },
  Farmgate: { id: 'Z_FAR', name: 'Farmgate', lat: 23.7570, lng: 90.3896 },
  Dhanmondi: { id: 'Z_DHA', name: 'Dhanmondi', lat: 23.7465, lng: 90.3760 },
  'Mirpur 10': { id: 'Z_MIR', name: 'Mirpur 10', lat: 23.8069, lng: 90.3687 },
  Uttara: { id: 'Z_UTT', name: 'Uttara', lat: 23.8759, lng: 90.3795 },
  Bashundhara: { id: 'Z_BAS', name: 'Bashundhara', lat: 23.8191, lng: 90.4326 },
};

// Distance matrix in kilometers (PRD §4 simple geography)
export const ZONE_DISTANCES: Record<string, Record<string, number>> = {
  Banani: {
    Banani: 0.0,
    'Gulshan 1': 2.5,
    'Gulshan 2': 1.5,
    Mohakhali: 3.0,
    Farmgate: 5.5,
    Dhanmondi: 8.0,
    'Mirpur 10': 7.0,
    Uttara: 9.5,
    Bashundhara: 4.2,
  },
  'Gulshan 1': {
    Banani: 2.5,
    'Gulshan 1': 0.0,
    'Gulshan 2': 1.8,
    Mohakhali: 2.2,
    Farmgate: 5.0,
    Dhanmondi: 7.5,
    'Mirpur 10': 8.5,
    Uttara: 11.0,
    Bashundhara: 5.0,
  },
  'Gulshan 2': {
    Banani: 1.5,
    'Gulshan 1': 1.8,
    'Gulshan 2': 0.0,
    Mohakhali: 3.5,
    Farmgate: 6.0,
    Dhanmondi: 8.5,
    'Mirpur 10': 8.0,
    Uttara: 10.0,
    Bashundhara: 3.2,
  },
  Mohakhali: {
    Banani: 3.0,
    'Gulshan 1': 2.2,
    'Gulshan 2': 3.5,
    Mohakhali: 0.0,
    Farmgate: 3.2,
    Dhanmondi: 5.8,
    'Mirpur 10': 6.5,
    Uttara: 12.0,
    Bashundhara: 6.5,
  },
  Farmgate: {
    Banani: 5.5,
    'Gulshan 1': 5.0,
    'Gulshan 2': 6.0,
    Mohakhali: 3.2,
    Farmgate: 0.0,
    Dhanmondi: 3.5,
    'Mirpur 10': 6.0,
    Uttara: 14.0,
    Bashundhara: 8.5,
  },
  Dhanmondi: {
    Banani: 8.0,
    'Gulshan 1': 7.5,
    'Gulshan 2': 8.5,
    Mohakhali: 5.8,
    Farmgate: 3.5,
    Dhanmondi: 0.0,
    'Mirpur 10': 8.0,
    Uttara: 16.5,
    Bashundhara: 11.0,
  },
  'Mirpur 10': {
    Banani: 7.0,
    'Gulshan 1': 8.5,
    'Gulshan 2': 8.0,
    Mohakhali: 6.5,
    Farmgate: 6.0,
    Dhanmondi: 8.0,
    'Mirpur 10': 0.0,
    Uttara: 8.5,
    Bashundhara: 9.0,
  },
  Uttara: {
    Banani: 9.5,
    'Gulshan 1': 11.0,
    'Gulshan 2': 10.0,
    Mohakhali: 12.0,
    Farmgate: 14.0,
    Dhanmondi: 16.5,
    'Mirpur 10': 8.5,
    Uttara: 0.0,
    Bashundhara: 6.0,
  },
  Bashundhara: {
    Banani: 4.2,
    'Gulshan 1': 5.0,
    'Gulshan 2': 3.2,
    Mohakhali: 6.5,
    Farmgate: 8.5,
    Dhanmondi: 11.0,
    'Mirpur 10': 9.0,
    Uttara: 6.0,
    Bashundhara: 0.0,
  },
};

export const PRICING_CONFIG = {
  baseFarePoysha: 3000,      // ৳30.00
  ratePerKmPoysha: 1500,     // ৳15.00 / km
  poolDiscountPercent: 25,   // 25% discount for shared rides
  bulletMaxCapacity: 3,      // Bullet physical capacity
};

export interface FareCalculation {
  distanceKm: number;
  baseFarePoysha: number;
  distanceFarePoysha: number;
  subtotalPoysha: number;
  discountPoysha: number;
  totalFarePoysha: number;
  formatted: {
    baseFareBdt: string;
    distanceFareBdt: string;
    discountBdt: string;
    totalFareBdt: string;
  };
}

/**
 * Calculates deterministic integer poysha fare according to PRD §5:
 * passengerFare = baseFare + distanceCharge - poolDiscount
 */
export function calculateFare(
  pickupZone: string,
  destinationZone: string,
  isPooled: boolean = false,
  seats: number = 1
): FareCalculation {
  const seatMultiplier = Math.max(1, seats);
  const distanceKm = ZONE_DISTANCES[pickupZone]?.[destinationZone] ?? 3.0;

  const baseFarePoysha = PRICING_CONFIG.baseFarePoysha * seatMultiplier;
  // distanceCharge = distanceKm * ratePerKm * seats
  const distanceFarePoysha = Math.round(distanceKm * PRICING_CONFIG.ratePerKmPoysha) * seatMultiplier;
  const subtotalPoysha = baseFarePoysha + distanceFarePoysha;

  let discountPoysha = 0;
  if (isPooled) {
    discountPoysha = Math.floor((subtotalPoysha * PRICING_CONFIG.poolDiscountPercent) / 100);
  }

  const totalFarePoysha = subtotalPoysha - discountPoysha;

  return {
    distanceKm,
    baseFarePoysha,
    distanceFarePoysha,
    subtotalPoysha,
    discountPoysha,
    totalFarePoysha,
    formatted: {
      baseFareBdt: (baseFarePoysha / 100).toFixed(2),
      distanceFareBdt: (distanceFarePoysha / 100).toFixed(2),
      discountBdt: (discountPoysha / 100).toFixed(2),
      totalFareBdt: (totalFarePoysha / 100).toFixed(2),
    },
  };
}

/**
 * Validates route compatibility for pooling Nusrat & Rafiq (PRD §4):
 * Same pickup zone (Banani) and compatible southbound heading.
 */
export function isRouteCompatible(
  pickupA: string,
  destA: string,
  pickupB: string,
  destB: string
): boolean {
  if (pickupA !== pickupB) {
    return false; // Must share pickup zone for Banani rush hour
  }

  // Predefined compatible clusters
  const southbound = ['Mohakhali', 'Gulshan 1', 'Farmgate', 'Dhanmondi'];
  const northbound = ['Gulshan 2', 'Uttara', 'Bashundhara', 'Mirpur 10'];

  const bothSouth = southbound.includes(destA) && southbound.includes(destB);
  const bothNorth = northbound.includes(destA) && northbound.includes(destB);

  return bothSouth || bothNorth;
}
