import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import { cancelToken, createOnlineBooking } from '../services/bookingService.js';
import { tokenQueueInfo } from '../services/liveStats.js';
import { serializeToken } from '../services/tokenView.js';
import AppError from '../utils/AppError.js';
import { extractTokenCode } from '../utils/helpers.js';

function canSeeFullToken(user, token) {
  if (!user) return false;
  if (token.userId && String(token.userId) === String(user._id)) return true;
  if (user.role === 'superadmin') return true;
  return ['staff', 'admin'].includes(user.role) && String(user.templeId) === String(token.templeId);
}

async function findTokenByCode(rawCode) {
  const code = extractTokenCode(rawCode);
  const token = code && (await Token.findOne({ code }));
  if (!token) throw new AppError(404, 'Token not found');
  return token;
}

export async function bookOnline(req, res) {
  const { token, temple } = await createOnlineBooking(req.user, req.valid.body);
  res.status(201).json({ token: serializeToken(token, temple, { full: true }) });
}

export async function myTokens(req, res) {
  const { scope } = req.valid.query;
  const now = new Date();
  const filter = { userId: req.user._id };
  if (scope === 'upcoming') filter.status = { $in: ['booked', 'checked_in'] };
  if (scope === 'past') filter.status = { $in: ['completed', 'cancelled', 'expired'] };

  const tokens = await Token.find(filter)
    .sort({ slotStartAt: scope === 'past' ? -1 : 1 })
    .limit(100);
  const temples = await Temple.find({ _id: { $in: [...new Set(tokens.map((t) => String(t.templeId)))] } });
  const templeById = new Map(temples.map((t) => [String(t._id), t]));

  res.json({
    now,
    tokens: tokens
      .filter((t) => templeById.has(String(t.templeId)))
      .map((t) => serializeToken(t, templeById.get(String(t.templeId)), { full: true })),
  });
}

export async function getTokenStatus(req, res) {
  const token = await findTokenByCode(req.params.code);
  const temple = await Temple.findById(token.templeId);
  if (!temple) throw new AppError(404, 'Temple not found');

  const full = canSeeFullToken(req.user, token);
  res.json({
    token: serializeToken(token, temple, { full }),
    queue: await tokenQueueInfo(token, temple),
    isOwner: Boolean(req.user && token.userId && String(token.userId) === String(req.user._id)),
  });
}

export async function cancel(req, res) {
  const token = await findTokenByCode(req.params.code);
  const cancelled = await cancelToken(req.user, token);
  const temple = await Temple.findById(cancelled.templeId);
  res.json({ token: serializeToken(cancelled, temple, { full: true }) });
}
