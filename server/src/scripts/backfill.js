/**
 * Brings stale demo data up to today WITHOUT deleting anything.
 *
 * Seeding generates 90 days of history ending on the day it ran, so a database
 * seeded weeks ago leaves a hole in the analytics charts and has no upcoming
 * bookings left. This fills the gap in place:
 *
 *   - extends each temple's festival calendar forward
 *   - generates the missing hourly footfall days (real scan data is never overwritten)
 *   - re-syncs slots, then books today/tomorrow and puts walk-ins in the queue
 *   - retrains the prediction models
 *
 * Every user account, password and past token is left untouched — unlike
 * `npm run seed -- --reset`, which wipes the database first.
 *
 *   npm run backfill
 *   npm run backfill -- --days=90    how much history to guarantee (default 90)
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { trainModels } from '../jobs/index.js';
import FootfallLog from '../models/FootfallLog.js';
import Slot from '../models/Slot.js';
import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { syncSlots } from '../services/slotService.js';
import { addDays, localDateStr, localHour } from '../utils/tz.js';
import { createDemoActivity, createDemoDevoteeBookings, generateFootfallRange, TEMPLES } from './seedData.js';

const args = new Set(process.argv.slice(2));
const daysArg = [...args].find((a) => a.startsWith('--days='));
const HISTORY_DAYS = Number(daysArg?.split('=')[1] || 90);

/** Same deterministic PRNG the seed uses, so backfilled days look like seeded ones. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Keeps the Ekadashi cadence (every 15 days) running up to `until`, so the
 * week-ahead forecast still has a festival to show.
 */
function extendFestivals(temple, def, today, until) {
  const existing = new Set(temple.festivals.map((f) => f.date));
  const ekadashis = temple.festivals.filter((f) => f.name === 'Ekadashi').map((f) => f.date).sort();
  const added = [];

  // Continue from the last known Ekadashi; fall back to the seed's own offset.
  let cursor = ekadashis.at(-1) ?? addDays(today, def.ekadashiOffset);
  while (cursor <= until) {
    if (cursor >= today && !existing.has(cursor)) {
      added.push({ name: 'Ekadashi', date: cursor });
      existing.add(cursor);
    }
    cursor = addDays(cursor, 15);
  }

  if (added.length) {
    temple.festivals.push(...added);
    temple.festivals.sort((a, b) => a.date.localeCompare(b.date));
  }
  return added;
}

await connectDB();

const temples = await Temple.find();
if (!temples.length) {
  console.log('[backfill] no temples found. Run "npm run seed" first.');
  await disconnectDB();
  process.exit(0);
}

const now = new Date();
let totalInserted = 0;

for (const [index, temple] of temples.entries()) {
  const def = TEMPLES.find((t) => t.slug === temple.slug);
  if (!def) {
    console.log(`[backfill] ${temple.name}: not a demo temple (no seed profile), skipping footfall`);
    continue;
  }

  const today = localDateStr(now, temple.timezone);
  const from = addDays(today, -HISTORY_DAYS);

  const festivals = extendFestivals(temple, def, today, addDays(today, 30));
  if (festivals.length) await temple.save();

  // Generate the whole window, then keep only the hours that aren't recorded yet:
  // real scan data already in the log always wins.
  const existing = await FootfallLog.find({ templeId: temple._id, date: { $gte: from } }).select('date hour').lean();
  const have = new Set(existing.map((l) => `${l.date}|${l.hour}`));

  const generated = generateFootfallRange(temple, def, {
    fromDate: from,
    toDate: today,
    currentHour: localHour(now, temple.timezone),
    seed: 1000 + index,
  });
  const missing = generated.filter((log) => !have.has(`${log.date}|${log.hour}`));

  if (missing.length) await FootfallLog.insertMany(missing, { ordered: false });
  totalInserted += missing.length;

  const days = new Set(missing.map((l) => l.date));
  console.log(
    `[backfill] ${temple.name}: +${missing.length} footfall records across ${days.size} day(s)` +
      `${festivals.length ? `, +${festivals.length} festival date(s)` : ''}`,
  );
}

// Slots for today and the booking window, then fresh bookings and a live queue.
for (const temple of temples) {
  const today = localDateStr(now, temple.timezone);
  const result = await syncSlots(temple);
  if (result.created) console.log(`[backfill] ${temple.name}: +${result.created} slots`);

  const upcoming = await Token.countDocuments({ templeId: temple._id, slotDate: { $gte: today }, status: { $in: ['booked', 'checked_in'] } });
  if (upcoming >= 10) {
    console.log(`[backfill] ${temple.name}: ${upcoming} upcoming tokens already, leaving bookings alone`);
    continue;
  }

  const devotees = await User.find({ role: 'devotee', email: /@example\.com$/ }).limit(24);
  const staff = await User.findOne({ role: 'staff', templeId: temple._id });
  if (!devotees.length || !staff) {
    console.log(`[backfill] ${temple.name}: no demo devotees or gate staff found, skipping bookings`);
    continue;
  }

  const { bookings, inQueue } = await createDemoActivity({ temple, devotees, staff, now, random: mulberry32(2026) });
  console.log(`[backfill] ${temple.name}: ${bookings} bookings, ${inQueue} people in queue`);
}

const demoDevotee = await User.findOne({ email: 'devotee@smartdarshan.in' });
if (demoDevotee) {
  const mine = await Token.countDocuments({ userId: demoDevotee._id, status: 'booked' });
  if (mine) {
    console.log(`[backfill] demo devotee already has ${mine} upcoming booking(s)`);
  } else {
    await createDemoDevoteeBookings(demoDevotee, now);
    console.log(`[backfill] demo devotee: ${await Token.countDocuments({ userId: demoDevotee._id, status: 'booked' })} upcoming booking(s)`);
  }
}

if (totalInserted) await trainModels();

const users = await User.countDocuments();
console.log(`[backfill] done. ${totalInserted} footfall records added, ${users} accounts untouched. Refresh any open browser tabs.`);

await disconnectDB();
process.exit(0);
