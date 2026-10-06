import { Router } from 'express';
import { z } from 'zod';
import * as temples from '../controllers/templeController.js';
import { validate } from '../middleware/validate.js';
import { dateStr, objectId } from './schemas.js';

const router = Router();

router.get(
  '/',
  validate({ query: z.object({ q: z.string().trim().max(60).optional(), city: z.string().trim().max(60).optional() }) }),
  temples.listTemples,
);
router.get('/:idOrSlug', temples.getTemple);
router.get(
  '/:idOrSlug/slots',
  validate({ query: z.object({ date: dateStr.optional(), darshanTypeId: objectId.optional() }) }),
  temples.getSlots,
);
router.get('/:idOrSlug/live', temples.getLive);
router.get('/:idOrSlug/forecast', validate({ query: z.object({ date: dateStr.optional() }) }), temples.getTempleForecast);
router.get('/:idOrSlug/announcements', temples.getAnnouncements);

export default router;
