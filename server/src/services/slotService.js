import Slot from '../models/Slot.js';
import { addDays, localDateStr, zonedTimeToUtc } from '../utils/tz.js';

const MINUTE = 60_000;

/** How many people a lane can process per minute when no live measurement exists. */
export function defaultThroughput(darshanType) {
  return darshanType.capacityPerSlot / darshanType.slotMinutes;
}

/** Builds (but does not save) the slots a temple should have on a given local date. */
export function buildSlotsForDate(temple, dateStr) {
  const isFestival = temple.isFestivalDate(dateStr);
  const multiplier = isFestival ? temple.settings.festivalCapacityMultiplier : 1;
  const dayStart = zonedTimeToUtc(dateStr, temple.openTime, temple.timezone).getTime();
  const dayEnd = zonedTimeToUtc(dateStr, temple.closeTime, temple.timezone).getTime();
  const slots = [];

  for (const dt of temple.darshanTypes.filter((d) => d.active)) {
    const capacity = Math.round(dt.capacityPerSlot * multiplier);
    const walkinCapacity = Math.round((capacity * dt.walkinPercent) / 100);
    const step = dt.slotMinutes * MINUTE;

    for (let t = dayStart; t + step <= dayEnd; t += step) {
      slots.push({
        templeId: temple._id,
        darshanTypeId: dt._id,
        date: dateStr,
        startAt: new Date(t),
        endAt: new Date(t + step),
        onlineCapacity: capacity - walkinCapacity,
        walkinCapacity,
        isFestival,
      });
    }
  }
  return slots;
}

/**
 * Makes sure slots exist for the booking window (today + N days) and match the
 * temple's current configuration. Safe to run repeatedly:
 *  - missing slots are created
 *  - future slots get updated capacity (never below what is already booked)
 *  - future slots with no bookings that no longer fit the timings are removed
 */
export async function syncSlots(temple, { days } = {}) {
  const now = new Date();
  const today = localDateStr(now, temple.timezone);
  const windowDays = days ?? temple.settings.bookingWindowDays;
  const dates = Array.from({ length: windowDays }, (_, i) => addDays(today, i));
  const wanted = dates.flatMap((date) => buildSlotsForDate(temple, date));
  const key = (s) => `${s.darshanTypeId}|${new Date(s.startAt).getTime()}`;

  let created = 0;
  let updated = 0;
  let removed = 0;

  if (wanted.length) {
    const insertResult = await Slot.bulkWrite(
      wanted.map((slot) => ({
        updateOne: {
          filter: { templeId: slot.templeId, darshanTypeId: slot.darshanTypeId, startAt: slot.startAt },
          update: { $setOnInsert: { ...slot, createdAt: now, updatedAt: now } },
          upsert: true,
          timestamps: false,
        },
      })),
      { ordered: false },
    );
    created = insertResult.upsertedCount;

    const future = wanted.filter((slot) => slot.startAt > now);
    if (future.length) {
      const updateResult = await Slot.bulkWrite(
        future.map((slot) => ({
          updateOne: {
            filter: {
              templeId: slot.templeId,
              darshanTypeId: slot.darshanTypeId,
              startAt: slot.startAt,
              onlineBooked: { $lte: slot.onlineCapacity },
              walkinBooked: { $lte: slot.walkinCapacity },
            },
            update: {
              $set: {
                endAt: slot.endAt,
                onlineCapacity: slot.onlineCapacity,
                walkinCapacity: slot.walkinCapacity,
                isFestival: slot.isFestival,
              },
            },
            // Without this Mongoose bumps updatedAt and every slot counts as "updated".
            timestamps: false,
          },
        })),
        { ordered: false },
      );
      updated = updateResult.modifiedCount;
    }
  }

  const wantedKeys = new Set(wanted.map(key));
  const stale = await Slot.find(
    {
      templeId: temple._id,
      date: { $in: dates },
      startAt: { $gt: now },
      onlineBooked: 0,
      walkinBooked: 0,
    },
    { darshanTypeId: 1, startAt: 1 },
  ).lean();
  const staleIds = stale.filter((slot) => !wantedKeys.has(key(slot))).map((slot) => slot._id);
  if (staleIds.length) {
    removed = (await Slot.deleteMany({ _id: { $in: staleIds } })).deletedCount;
  }

  return { created, updated, removed, days: windowDays };
}

/** Seats left for online booking and for walk-ins, including the walk-in release rule. */
export function slotAvailability(slot, temple, now = new Date()) {
  const totalLeft = Math.max(0, slot.onlineCapacity + slot.walkinCapacity - slot.onlineBooked - slot.walkinBooked);
  const onlineLeft = Math.min(Math.max(0, slot.onlineCapacity - slot.onlineBooked), totalLeft);
  const walkinQuotaLeft = Math.min(Math.max(0, slot.walkinCapacity - slot.walkinBooked), totalLeft);
  const releaseActive = new Date(slot.startAt).getTime() - now.getTime() <= temple.settings.walkinReleaseMin * MINUTE;

  return {
    online: onlineLeft,
    walkin: releaseActive ? totalLeft : walkinQuotaLeft,
    total: totalLeft,
    releaseActive,
  };
}

export function serializeSlot(slot, temple, now = new Date()) {
  const s = slot.toObject ? slot.toObject() : slot;
  return {
    _id: s._id,
    darshanTypeId: s.darshanTypeId,
    date: s.date,
    startAt: s.startAt,
    endAt: s.endAt,
    isFestival: s.isFestival,
    capacity: s.onlineCapacity + s.walkinCapacity,
    onlineCapacity: s.onlineCapacity,
    walkinCapacity: s.walkinCapacity,
    onlineBooked: s.onlineBooked,
    walkinBooked: s.walkinBooked,
    available: slotAvailability(s, temple, now),
    isPast: new Date(s.endAt) <= now,
    isCurrent: new Date(s.startAt) <= now && new Date(s.endAt) > now,
  };
}
