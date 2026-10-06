import { Router } from 'express';
import { z } from 'zod';
import * as tokens from '../controllers/tokenController.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { groupSize, objectId, optionalPhone, personName } from './schemas.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('devotee'),
  validate({ body: z.object({ slotId: objectId, groupSize, name: personName, phone: optionalPhone }) }),
  tokens.bookOnline,
);
router.get(
  '/mine',
  authenticate,
  validate({ query: z.object({ scope: z.enum(['upcoming', 'past', 'all']).default('all') }) }),
  tokens.myTokens,
);
router.get('/:code', optionalAuth, tokens.getTokenStatus);
router.post('/:code/cancel', authenticate, tokens.cancel);

export default router;
