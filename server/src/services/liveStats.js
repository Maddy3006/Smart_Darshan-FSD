import FootfallLog from '../models/FootfallLog.js';
import Slot from '../models/Slot.js';
import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import { emitTo } from '../sockets/index.js';
import { round1 } from '../utils/helpers.js';
import { localDateStr, zonedTimeToUtc } from '../utils/tz.js';
import { checkOccupancy } from './alertService.js';
import { defaultThroughput } from './slotService.js';

/**
 * The wait-time engine.
 *
 * For each darshan type (lane):
 *   inQueue    = people scanned in at the entry gate but not yet out
 *   throughput = people who exited in the last 15 minutes / minutes observed
 *                (falls back to the lane's designed capacity when too few exits were seen)
 *   waitMin    = inQueue / throughput
 */
const THROUGHPUT_WINDOW_MIN = 15;
const MIN_MEASURED_PEOPLE = 10;
const MIN_OBSERVED_MIN = 5;
const MAX_SNAPSHOT_AGE_MS = 10_000;

const snapshots = new Map();
const pendingPublishes = new Map();

async function loadTemple(templeOrId) {
  if (templeOrId?.darshanTypes) return templeOrId;
  return Temple.findById(templeOrId);
}

export async function computeSnapshot(templeOrId) {
  const temple = await loadTemple(templeOrId);
  if (!temple) throw new Error('Temple not found');

  const now = new Date();
  const today = localDateStr(now, temple.timezone);
  const windowStart = new Date(now.getTime() - THROUGHPUT_WINDOW_MIN * 60_000);

  const [queued, recentlyCompleted, footfallToday, currentSlots] = await Promise.all([
    Token.aggregate([
      { $match: { templeId: temple._id, status: 'checked_in' } },
      { $group: { _id: '$darshanTypeId', people: { $sum: '$groupSize' }, tokens: { $sum: 1 } } },
    ]),
    Token.aggregate([
      { $match: { templeId: temple._id, status: 'completed', completedAt: { $gte: windowStart }, autoCompleted: { $ne: true } } },
      { $group: { _id: '$darshanTypeId', people: { $sum: '$groupSize' }, firstAt: { $min: '$completedAt' } } },
    ]),
    FootfallLog.aggregate([
      { $match: { templeId: temple._id, date: today } },
      { $group: { _id: null, entries: { $sum: '$entries' }, exits: { $sum: '$exits' } } },
    ]),
    Slot.find({ templeId: temple._id, startAt: { $lte: now }, endAt: { $gt: now } }).lean(),
  ]);

  const byLane = (rows, id) => rows.find((row) => String(row._id) === String(id));

  const lanes = temple.darshanTypes
    .filter((dt) => dt.active)
    .map((dt) => {
      const queue = byLane(queued, dt._id);
      const done = byLane(recentlyCompleted, dt._id);
      const inQueue = queue?.people ?? 0;
      const completedRecently = done?.people ?? 0;
      const measured = completedRecently >= MIN_MEASURED_PEOPLE;
      // Measure over the span actually observed (at least 5 min), so a gate that only
      // started exiting people a few minutes ago isn't treated as slow.
      const observedMin = done
        ? Math.min(THROUGHPUT_WINDOW_MIN, Math.max(MIN_OBSERVED_MIN, (now.getTime() - new Date(done.firstAt).getTime()) / 60_000))
        : THROUGHPUT_WINDOW_MIN;
      const throughput = measured ? completedRecently / observedMin : defaultThroughput(dt);
      const slot = currentSlots.find((s) => String(s.darshanTypeId) === String(dt._id));

      return {
        darshanTypeId: dt._id,
        name: dt.name,
        isPriority: dt.isPriority,
        inQueue,
        tokensInQueue: queue?.tokens ?? 0,
        throughputPerMin: round1(throughput),
        throughputSource: measured ? 'measured' : 'estimated',
        waitMin: inQueue === 0 ? 0 : Math.ceil(inQueue / throughput),
        nowAdmitting: slot ? { slotId: slot._id, startAt: slot.startAt, endAt: slot.endAt } : null,
      };
    });

  const inQueue = lanes.reduce((sum, lane) => sum + lane.inQueue, 0);
  const openAt = zonedTimeToUtc(today, temple.openTime, temple.timezone);
  const closeAt = zonedTimeToUtc(today, temple.closeTime, temple.timezone);

  const snapshot = {
    templeId: temple._id,
    templeName: temple.name,
    isOpen: now >= openAt && now < closeAt,
    entryPaused: temple.controls.entryPaused,
    pauseReason: temple.controls.pauseReason,
    festival: temple.festivalName(today),
    lanes,
    totals: {
      inQueue,
      enteredToday: footfallToday[0]?.entries ?? 0,
      completedToday: footfallToday[0]?.exits ?? 0,
      maxOccupancy: temple.settings.maxOccupancy,
      occupancyPct: Math.round((inQueue / temple.settings.maxOccupancy) * 100),
      generalWaitMin: lanes.find((lane) => !lane.isPriority)?.waitMin ?? 0,
    },
    updatedAt: now,
  };

  snapshots.set(String(temple._id), snapshot);
  return snapshot;
}

export async function getSnapshot(templeId, { maxAgeMs = MAX_SNAPSHOT_AGE_MS } = {}) {
  const cached = snapshots.get(String(templeId));
  if (cached && Date.now() - new Date(cached.updatedAt).getTime() < maxAgeMs) return cached;
  return computeSnapshot(templeId);
}

export function getCachedSnapshot(templeId) {
  return snapshots.get(String(templeId)) || null;
}

export async function publishSnapshot(templeOrId) {
  const temple = await loadTemple(templeOrId);
  if (!temple) return null;
  const snapshot = await computeSnapshot(temple);
  emitTo(`temple:${temple._id}`, 'live:update', snapshot);
  await checkOccupancy(temple, snapshot);
  return snapshot;
}

/** Coalesces bursts of scans into one recomputation per temple. */
export function schedulePublish(templeId, delayMs = 400) {
  const key = String(templeId);
  if (pendingPublishes.has(key)) return;
  pendingPublishes.set(
    key,
    setTimeout(async () => {
      pendingPublishes.delete(key);
      try {
        await publishSnapshot(key);
      } catch (err) {
        console.error(`[live] publish failed for ${key}: ${err.message}`);
      }
    }, delayMs),
  );
}

/** Where a single token stands in the queue right now. */
export async function tokenQueueInfo(token, temple) {
  const snapshot = await getSnapshot(temple._id);
  const lane = snapshot.lanes.find((l) => String(l.darshanTypeId) === String(token.darshanTypeId));
  const throughput = lane?.throughputPerMin || 1;
  const now = Date.now();

  if (token.status === 'checked_in') {
    const [ahead] = await Token.aggregate([
      {
        $match: {
          templeId: temple._id,
          darshanTypeId: token.darshanTypeId,
          status: 'checked_in',
          checkedInAt: { $lt: token.checkedInAt },
        },
      },
      { $group: { _id: null, people: { $sum: '$groupSize' }, tokens: { $sum: 1 } } },
    ]);
    const peopleAhead = ahead?.people ?? 0;
    return {
      state: 'in_queue',
      position: (ahead?.tokens ?? 0) + 1,
      peopleAhead,
      waitMin: Math.ceil(peopleAhead / throughput),
      throughputPerMin: throughput,
      entryPaused: snapshot.entryPaused,
    };
  }

  if (token.status === 'booked') {
    const opensAt = new Date(token.slotStartAt.getTime() - temple.settings.checkinEarlyMin * 60_000);
    const closesAt = new Date(token.slotEndAt.getTime() + temple.settings.checkinLateMin * 60_000);
    return {
      state: now < opensAt.getTime() ? 'upcoming' : 'entry_open',
      minutesUntilSlot: Math.max(0, Math.ceil((token.slotStartAt.getTime() - now) / 60_000)),
      entryOpensAt: opensAt,
      entryClosesAt: closesAt,
      laneWaitMin: lane?.waitMin ?? 0,
      laneInQueue: lane?.inQueue ?? 0,
      entryPaused: snapshot.entryPaused,
      pauseReason: snapshot.pauseReason,
    };
  }

  return { state: token.status };
}
