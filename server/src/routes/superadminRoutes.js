import { Router } from 'express';
import { z } from 'zod';
import * as superadmin from '../controllers/superadminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { email, objectId, optionalPhone, password, personName, timeStr } from './schemas.js';

const router = Router();

router.use(authenticate, requireRole('superadmin'));

router.get('/overview', superadmin.overview);
router.get('/temples', superadmin.listTemples);
router.post(
  '/temples',
  validate({
    body: z.object({
      name: z.string().trim().min(3).max(120),
      slug: z.string().trim().max(80).optional(),
      deity: z.string().trim().max(80).optional(),
      description: z.string().trim().max(1000).optional(),
      address: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(60),
      state: z.string().trim().max(60).optional(),
      openTime: timeStr.default('05:00'),
      closeTime: timeStr.default('21:00'),
      admin: z.object({ name: personName, email, phone: optionalPhone, password }),
    }),
  }),
  superadmin.createTemple,
);
router.patch(
  '/temples/:templeId',
  validate({ params: z.object({ templeId: objectId }), body: z.object({ isActive: z.boolean() }) }),
  superadmin.updateTempleStatus,
);

export default router;
