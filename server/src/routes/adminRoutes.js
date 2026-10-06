import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { templeScope } from '../middleware/templeScope.js';
import { validate } from '../middleware/validate.js';
import { dateStr, email, objectId, optionalPhone, password, personName, timeStr } from './schemas.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'superadmin'), templeScope);

const darshanTypeFields = {
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  price: z.coerce.number().min(0).max(100000),
  slotMinutes: z.coerce.number().int().min(10).max(240),
  capacityPerSlot: z.coerce.number().int().min(1).max(10000),
  walkinPercent: z.coerce.number().int().min(0).max(100),
  isPriority: z.boolean().optional(),
  active: z.boolean().optional(),
};

const settingsSchema = z
  .object({
    maxOccupancy: z.coerce.number().int().min(1),
    bookingWindowDays: z.coerce.number().int().min(1).max(30),
    maxGroupSize: z.coerce.number().int().min(1).max(20),
    maxBookingsPerUserPerDay: z.coerce.number().int().min(1).max(20),
    checkinEarlyMin: z.coerce.number().int().min(0).max(240),
    checkinLateMin: z.coerce.number().int().min(0).max(240),
    walkinReleaseMin: z.coerce.number().int().min(0).max(600),
    autoCompleteAfterMin: z.coerce.number().int().min(30).max(1440),
    reminderBeforeMin: z.coerce.number().int().min(5).max(240),
    festivalCapacityMultiplier: z.coerce.number().min(1).max(5),
    autoPauseAtCapacity: z.boolean(),
  })
  .partial();

router.get('/temple', admin.getTemple);
router.patch(
  '/temple',
  validate({
    body: z
      .object({
        name: z.string().trim().min(2).max(120),
        deity: z.string().trim().max(80),
        description: z.string().trim().max(1000),
        address: z.string().trim().max(200),
        city: z.string().trim().min(2).max(60),
        state: z.string().trim().max(60),
        imageUrl: z.union([z.string().trim().url(), z.literal('')]),
        openTime: timeStr,
        closeTime: timeStr,
        settings: settingsSchema,
        festivals: z.array(z.object({ name: z.string().trim().min(2).max(80), date: dateStr })).max(200),
      })
      .partial()
      .refine((b) => !b.openTime || !b.closeTime || b.openTime < b.closeTime, 'Opening time must be before closing time'),
  }),
  admin.updateTemple,
);
router.post('/temple/darshan-types', validate({ body: z.object(darshanTypeFields) }), admin.addDarshanType);
router.patch(
  '/temple/darshan-types/:darshanTypeId',
  validate({ params: z.object({ darshanTypeId: objectId }), body: z.object(darshanTypeFields).partial() }),
  admin.updateDarshanType,
);

router.post('/slots/sync', validate({ body: z.object({ days: z.coerce.number().int().min(1).max(30).optional() }) }), admin.runSlotSync);
router.get('/slots', validate({ query: z.object({ date: dateStr.optional() }) }), admin.listSlots);

router.patch(
  '/controls',
  validate({ body: z.object({ entryPaused: z.boolean(), pauseReason: z.string().trim().max(200).optional() }) }),
  admin.updateControls,
);

router.get('/announcements', admin.listAnnouncements);
router.post(
  '/announcements',
  validate({ body: z.object({ message: z.string().trim().min(3).max(300), type: z.enum(['info', 'warning', 'urgent']).default('info') }) }),
  admin.createAnnouncement,
);
router.patch(
  '/announcements/:announcementId',
  validate({ params: z.object({ announcementId: objectId }), body: z.object({ isActive: z.boolean() }) }),
  admin.updateAnnouncement,
);

router.get('/staff', admin.listStaff);
router.post(
  '/staff',
  validate({
    body: z.object({ name: personName, email, phone: optionalPhone, password, role: z.enum(['staff', 'admin']).default('staff') }),
  }),
  admin.createStaff,
);
router.patch(
  '/staff/:userId',
  validate({
    params: z.object({ userId: objectId }),
    body: z.object({ name: personName, phone: optionalPhone, isActive: z.boolean(), password }).partial(),
  }),
  admin.updateStaff,
);

router.get('/stats/today', admin.statsToday);
router.get(
  '/stats/trends',
  validate({ query: z.object({ days: z.coerce.number().int().min(7).max(180).default(30) }) }),
  admin.statsTrends,
);
router.get('/forecast/week', admin.weekForecast);
router.get('/forecast/model', admin.modelStatus);
router.post('/forecast/train', admin.trainModel);

router.get('/alerts', admin.listAlerts);
router.post('/alerts/acknowledge', admin.acknowledgeAlerts);

export default router;
