import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { email, optionalPhone, password, personName } from './schemas.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' } },
});

router.post(
  '/register',
  authLimiter,
  validate({ body: z.object({ name: personName, email, phone: optionalPhone, password }) }),
  auth.register,
);
router.post('/login', authLimiter, validate({ body: z.object({ email, password: z.string().min(1) }) }), auth.login);
router.get('/me', authenticate, auth.me);
router.patch('/me', authenticate, validate({ body: z.object({ name: personName.optional(), phone: optionalPhone }) }), auth.updateMe);
router.post(
  '/me/password',
  authenticate,
  validate({ body: z.object({ currentPassword: z.string().min(1), newPassword: password }) }),
  auth.changePassword,
);

export default router;
