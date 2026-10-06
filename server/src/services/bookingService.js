import Slot from '../models/Slot.js';
import Temple from '../models/Temple.js';
import Token, { ACTIVE_STATUSES } from '../models/Token.js';
import AppError from '../utils/AppError.js';
import { generateTokenCode, normalizePhone } from '../utils/helpers.js';
import { formatDate, formatTime, localDateStr } from '../utils/tz.js';
import { schedulePublish } from './liveStats.js';
import { emitTokenChanged, notifyTokenHolder, tokenLink } from './notificationService.js';
import { serializeSlot } from './slotService.js';
import { emitTo } from '../sockets/index.js';

const MINUTE = 60_000;
const ONLINE_BOOKING_CUTOFF_MIN = 10;
const WALKIN_CUTOFF_MIN = 5;

/** Mongo condition: the slot still has room for `groupSize` more people overall. */
const fitsTotal = (groupSize) => ({
  $lte: [{ $add: ['$onlineBooked', '$walkinBooked', groupSize] }, { $add: ['$onlineCapacity', '$walkinCapacity'] }],
});

/**
 * Atomically reserves seats. The capacity check and the increment happen in a
 * single findOneAndUpdate, so two devotees racing for the last seats can never
 * overbook the slot. Returns null when there isn't enough room.
 */
function reserveSeats(slotId, groupSize, source, { useReleasedSeats = false } = {}) {
  const counter = source === 'online' ? 'onlineBooked' : 'walkinBooked';
  const quota = source === 'online' ? '$onlineCapacity' : '$walkinCapacity';
  const conditions = [fitsTotal(groupSize)];
  if (!useReleasedSeats) conditions.push({ $lte: [{ $add: [`$${counter}`, groupSize] }, quota] });

  return Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $and: conditions } },
    { $inc: { [counter]: groupSize } },
    { returnDocument: 'after' },
  );
}

async function releaseSeats(slotId, groupSize, source) {
  const counter = source === 'online' ? 'onlineBooked' : 'walkinBooked';
  await Slot.updateOne({ _id: slotId }, { $inc: { [counter]: -groupSize } });
}

async function createTokenDoc(data) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Token.create({ ...data, code: generateTokenCode() });
    } catch (err) {
      const codeClash = err.code === 11000 && err.keyPattern?.code;
      if (!codeClash) throw err;
    }
  }
  throw new AppError(500, 'Could not generate a unique token code');
}

function emitSlotChanged(slot, temple) {
  emitTo(`temple:${temple._id}`, 'slot:update', serializeSlot(slot, temple));
}

function describeSlot(token, temple) {
  const tz = temple.timezone;
  return `${formatDate(token.slotStartAt, tz)}, ${formatTime(token.slotStartAt, tz)}-${formatTime(token.slotEndAt, tz)}`;
}

export async function createOnlineBooking(user, { slotId, groupSize, name, phone }, { silent = false } = {}) {
  const slot = await Slot.findById(slotId);
  if (!slot) throw new AppError(404, 'Slot not found');

  const temple = await Temple.findById(slot.templeId);
  if (!temple?.isActive) throw new AppError(404, 'Temple not found');

  const darshanType = temple.darshanTypes.id(slot.darshanTypeId);
  if (!darshanType?.active) throw new AppError(400, 'This darshan type is no longer available');

  if (groupSize > temple.settings.maxGroupSize) {
    throw new AppError(400, `A booking can include at most ${temple.settings.maxGroupSize} people`);
  }
  if (slot.endAt.getTime() - Date.now() < ONLINE_BOOKING_CUTOFF_MIN * MINUTE) {
    throw new AppError(400, 'This slot is no longer open for booking', 'SLOT_CLOSED');
  }

  const bookingsThatDay = await Token.countDocuments({
    userId: user._id,
    templeId: temple._id,
    slotDate: slot.date,
    status: { $in: ACTIVE_STATUSES },
  });
  if (bookingsThatDay >= temple.settings.maxBookingsPerUserPerDay) {
    throw new AppError(
      400,
      `You can make at most ${temple.settings.maxBookingsPerUserPerDay} bookings per day at this temple`,
      'BOOKING_LIMIT',
    );
  }

  const reserved = await reserveSeats(slot._id, groupSize, 'online');
  if (!reserved) throw new AppError(409, 'Sorry, not enough seats are left in this slot', 'SLOT_FULL');

  let token;
  try {
    token = await createTokenDoc(tokenData({ slot, temple, darshanType, groupSize, name, phone, userId: user._id, source: 'online' }));
  } catch (err) {
    await releaseSeats(slot._id, groupSize, 'online');
    throw err;
  }

  emitSlotChanged(reserved, temple);
  if (!silent) {
    notifyTokenHolder(token, {
      title: 'Darshan booked',
      message: `Token ${token.code} confirmed for ${darshanType.name} at ${temple.name}, ${describeSlot(token, temple)} (${groupSize} ${groupSize === 1 ? 'person' : 'people'}). Track: ${tokenLink(token.code)}`,
      sms: true,
      level: 'success',
    });
  }
  return { token, temple };
}

/**
 * Issues a token at the temple counter or kiosk. Picks the earliest slot today
 * with walk-in room, unless a specific slot is requested. Within the release
 * window before a slot starts, unsold online seats can go to walk-ins too.
 */
export async function createWalkin(staffUser, temple, { darshanTypeId, slotId, groupSize, name, phone }, { silent = false } = {}) {
  const darshanType = temple.darshanTypes.id(darshanTypeId);
  if (!darshanType?.active) throw new AppError(400, 'Choose a valid darshan type');
  if (groupSize > temple.settings.maxGroupSize) {
    throw new AppError(400, `A token can include at most ${temple.settings.maxGroupSize} people`);
  }

  const now = new Date();
  const today = localDateStr(now, temple.timezone);
  const cutoff = new Date(now.getTime() + WALKIN_CUTOFF_MIN * MINUTE);
  const filter = { templeId: temple._id, darshanTypeId: darshanType._id, date: today, endAt: { $gt: cutoff } };
  if (slotId) filter._id = slotId;

  const candidates = await Slot.find(filter).sort({ startAt: 1 }).lean();
  if (slotId && !candidates.length) throw new AppError(400, 'That slot is not open for walk-ins right now');

  let reserved = null;
  for (const slot of candidates) {
    const useReleasedSeats = slot.startAt.getTime() - now.getTime() <= temple.settings.walkinReleaseMin * MINUTE;
    reserved = await reserveSeats(slot._id, groupSize, 'walkin', { useReleasedSeats });
    if (reserved) break;
  }
  if (!reserved) {
    throw new AppError(409, `No ${darshanType.name} seats are left for walk-ins today`, 'NO_WALKIN_SEATS');
  }

  let token;
  try {
    token = await createTokenDoc({
      ...tokenData({ slot: reserved, temple, darshanType, groupSize, name, phone, source: 'walkin' }),
      issuedBy: staffUser._id,
    });
  } catch (err) {
    await releaseSeats(reserved._id, groupSize, 'walkin');
    throw err;
  }

  if (silent) return { token, slot: reserved };

  emitSlotChanged(reserved, temple);
  schedulePublish(temple._id);
  notifyTokenHolder(token, {
    title: 'Walk-in token issued',
    message: `Walk-in token ${token.code} for ${darshanType.name} at ${temple.name}, ${describeSlot(token, temple)}. Track: ${tokenLink(token.code)}`,
    sms: true,
  });
  return { token, slot: reserved };
}

export async function cancelToken(user, token) {
  const isOwner = token.userId && String(token.userId) === String(user._id);
  const isTempleManager = user.role === 'superadmin' || (user.role === 'admin' && String(user.templeId) === String(token.templeId));
  if (!isOwner && !isTempleManager) throw new AppError(403, 'You can only cancel your own bookings');

  if (token.status !== 'booked') throw new AppError(409, `A ${token.status.replace('_', ' ')} token cannot be cancelled`);
  if (token.slotStartAt <= new Date() && !isTempleManager) {
    throw new AppError(409, 'This slot has already started and can no longer be cancelled');
  }

  const cancelled = await Token.findOneAndUpdate(
    { _id: token._id, status: 'booked' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!cancelled) throw new AppError(409, 'This token was updated by someone else. Please refresh');

  await releaseSeats(token.slotId, token.groupSize, token.source);

  const temple = await Temple.findById(token.templeId);
  const slot = await Slot.findById(token.slotId);
  if (slot && temple) emitSlotChanged(slot, temple);
  emitTokenChanged(cancelled);
  notifyTokenHolder(cancelled, {
    title: 'Booking cancelled',
    message: `Token ${cancelled.code} at ${temple?.name ?? 'the temple'} has been cancelled.`,
    sms: true,
  });
  return cancelled;
}

function tokenData({ slot, temple, darshanType, groupSize, name, phone, userId, source }) {
  const now = Date.now();
  const startsSoon = slot.startAt.getTime() - now <= temple.settings.reminderBeforeMin * MINUTE;
  return {
    templeId: temple._id,
    slotId: slot._id,
    darshanTypeId: darshanType._id,
    darshanTypeName: darshanType.name,
    userId,
    source,
    name,
    phone: normalizePhone(phone) || undefined,
    groupSize,
    slotDate: slot.date,
    slotStartAt: slot.startAt,
    slotEndAt: slot.endAt,
    // No reminder needed when the slot starts within the reminder window anyway.
    reminderSentAt: startsSoon ? new Date() : undefined,
  };
}
