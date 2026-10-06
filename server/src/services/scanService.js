import Token from '../models/Token.js';
import AppError from '../utils/AppError.js';
import { extractTokenCode } from '../utils/helpers.js';
import { formatTime } from '../utils/tz.js';
import { recordFootfall } from './footfallService.js';
import { schedulePublish, tokenQueueInfo } from './liveStats.js';
import { emitTokenChanged, notifyTokenHolder } from './notificationService.js';
import { serializeToken } from './tokenView.js';

const MINUTE = 60_000;

const STATUS_MESSAGES = {
  cancelled: 'This token was cancelled',
  expired: 'This token has expired (slot missed)',
};

/**
 * Handles a QR scan at the entry or exit gate. This is what keeps the live
 * queue count accurate: entry puts people in the queue, exit takes them out.
 */
export async function scanToken({ staff, temple, rawCode, action }) {
  const code = extractTokenCode(rawCode);
  if (!code) throw new AppError(400, 'That is not a Smart Darshan token', 'INVALID_CODE');

  const token = await Token.findOne({ code });
  if (!token) throw new AppError(404, `Token ${code} was not found`, 'TOKEN_NOT_FOUND');

  const fail = (status, message, errorCode) => {
    throw new AppError(status, message, errorCode, { token: serializeToken(token, temple, { full: true }) });
  };

  if (String(token.templeId) !== String(temple._id)) {
    fail(409, 'This token belongs to a different temple', 'WRONG_TEMPLE');
  }

  const now = new Date();
  const tz = temple.timezone;
  let updated;

  if (action === 'entry') {
    if (temple.controls.entryPaused) {
      fail(409, `Entry is paused${temple.controls.pauseReason ? `: ${temple.controls.pauseReason}` : ''}`, 'ENTRY_PAUSED');
    }
    if (token.status === 'checked_in') fail(409, `Already entered at ${formatTime(token.checkedInAt, tz)}`, 'ALREADY_ENTERED');
    if (token.status === 'completed') fail(409, 'This darshan is already completed', 'ALREADY_COMPLETED');
    if (STATUS_MESSAGES[token.status]) fail(409, STATUS_MESSAGES[token.status], 'TOKEN_INACTIVE');

    const opensAt = new Date(token.slotStartAt.getTime() - temple.settings.checkinEarlyMin * MINUTE);
    const closesAt = new Date(token.slotEndAt.getTime() + temple.settings.checkinLateMin * MINUTE);
    if (now < opensAt) fail(409, `Too early. Entry opens at ${formatTime(opensAt, tz)}`, 'TOO_EARLY');
    if (now > closesAt) fail(409, `Slot missed. Entry closed at ${formatTime(closesAt, tz)}`, 'SLOT_MISSED');

    updated = await Token.findOneAndUpdate(
      { _id: token._id, status: 'booked' },
      { $set: { status: 'checked_in', checkedInAt: now, checkedInBy: staff._id } },
      { returnDocument: 'after' },
    );
    if (!updated) fail(409, 'This token was just scanned. Please scan again', 'CONFLICT');
    await recordFootfall(temple, now, { entries: token.groupSize });
  } else {
    if (token.status === 'booked') fail(409, 'This token has not been scanned at the entry gate', 'NOT_ENTERED');
    if (token.status === 'completed') fail(409, `Already exited at ${formatTime(token.completedAt, tz)}`, 'ALREADY_COMPLETED');
    if (STATUS_MESSAGES[token.status]) fail(409, STATUS_MESSAGES[token.status], 'TOKEN_INACTIVE');

    updated = await Token.findOneAndUpdate(
      { _id: token._id, status: 'checked_in' },
      { $set: { status: 'completed', completedAt: now, completedBy: staff._id } },
      { returnDocument: 'after' },
    );
    if (!updated) fail(409, 'This token was just scanned. Please scan again', 'CONFLICT');
    await recordFootfall(temple, now, { exits: token.groupSize });
  }

  emitTokenChanged(updated);
  schedulePublish(temple._id);

  if (action === 'entry') {
    const queue = await tokenQueueInfo(updated, temple);
    notifyTokenHolder(updated, {
      title: 'You are in the queue',
      message: `${queue.peopleAhead} people ahead of you. Estimated wait about ${queue.waitMin} min.`,
      level: 'success',
    });
  } else {
    notifyTokenHolder(updated, {
      title: 'Darshan completed',
      message: `Thank you for visiting ${temple.name}.`,
      level: 'success',
    });
  }

  return updated;
}
