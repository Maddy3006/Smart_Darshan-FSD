import Temple from '../models/Temple.js';
import AppError from '../utils/AppError.js';
import { isObjectId } from '../utils/helpers.js';

/**
 * Resolves the temple a staff/admin request acts on and sets req.temple.
 * Staff and admins are locked to their own temple; the temple id is never taken
 * from the URL. A superadmin picks a temple with the X-Temple-Id header.
 */
export async function templeScope(req, _res, next) {
  const isSuper = req.user.role === 'superadmin';
  const templeId = isSuper ? req.get('X-Temple-Id') : req.user.templeId;

  if (!templeId) {
    throw new AppError(400, isSuper ? 'Select a temple to manage first' : 'Your account is not linked to a temple', 'TEMPLE_REQUIRED');
  }
  if (!isObjectId(templeId)) throw new AppError(400, 'Invalid temple id');

  const temple = await Temple.findById(templeId);
  if (!temple) throw new AppError(404, 'Temple not found');
  if (!temple.isActive && !isSuper) throw new AppError(403, 'This temple is currently inactive');

  req.temple = temple;
  next();
}
