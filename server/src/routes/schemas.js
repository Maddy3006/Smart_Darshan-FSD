import { z } from 'zod';
import { isObjectId } from '../utils/helpers.js';

export const objectId = z.string().refine(isObjectId, 'Invalid id');
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Use HH:mm (24-hour)');
export const email = z.string().trim().toLowerCase().email('Enter a valid email');
export const password = z.string().min(6, 'Password must be at least 6 characters').max(100);
export const personName = z.string().trim().min(2, 'Name is too short').max(80);
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{10,16}$/, 'Enter a valid phone number');
export const optionalPhone = z.union([phone, z.literal('')]).optional();
export const groupSize = z.coerce.number().int().min(1, 'At least 1 person').max(20);
