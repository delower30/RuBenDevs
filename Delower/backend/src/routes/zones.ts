// backend/src/routes/zones.ts
import { Router, Request, Response } from 'express';
import { DHAKA_ZONES, ZONE_DISTANCES, PRICING_CONFIG } from '../lib/pricing';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  return res.json({
    zones: Object.values(DHAKA_ZONES),
    distances: ZONE_DISTANCES,
    pricing: {
      baseFareBdt: (PRICING_CONFIG.baseFarePoysha / 100).toFixed(2),
      ratePerKmBdt: (PRICING_CONFIG.ratePerKmPoysha / 100).toFixed(2),
      poolDiscountPercent: PRICING_CONFIG.poolDiscountPercent,
      bulletMaxCapacity: PRICING_CONFIG.bulletMaxCapacity,
    },
  });
});

export default router;
