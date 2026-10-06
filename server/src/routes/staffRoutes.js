import { Router } from 'express';
import { z } from 'zod';
import * as staff from '../controllers/staffController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { templeScope } from '../middleware/templeScope.js';
import { validate } from '../middleware/validate.js';
import { TOKEN_STATUSES } from '../models/Token.js';
import { groupSize, objectId, optionalPhone, personName } from './schemas.js';

const router = Router();

router.use(authenticate, requireRole('staff', 'admin', 'superadmin'), templeScope);

router.get('/context', staff.context);
router.get('/walkin/slots', validate({ query: z.object({ darshanTypeId: objectId.optional() }) }), staff.walkinSlots);
router.post(
  '/walkin',
  validate({
    body: z.object({
      darshanTypeId: objectId,
      slotId: objectId.optional(),
      groupSize,
      name: personName,
      phone: optionalPhone,
    }),
  }),
  staff.issueWalkin,
);
router.post(
  '/scan',
  validate({ body: z.object({ code: z.string().trim().min(3).max(300), action: z.enum(['entry', 'exit']) }) }),
  staff.scan,
);
router.get(
  '/tokens',
  validate({
    query: z.object({
      status: z.enum(TOKEN_STATUSES).optional(),
      source: z.enum(['online', 'walkin']).optional(),
      q: z.string().trim().max(60).optional(),
      enterable: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
      sort: z.enum(['recent', 'oldest', 'slot']).default('recent'),
      limit: z.coerce.number().int().min(1).max(200).default(30),
    }),
  }),
  staff.listTokens,
);

export default router;
