import env from '../config/env.js';
import Alert from '../models/Alert.js';
import Announcement from '../models/Announcement.js';
import FootfallLog from '../models/FootfallLog.js';
import Slot from '../models/Slot.js';
import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { createOnlineBooking, createWalkin } from '../services/bookingService.js';
import { recordFootfall } from '../services/footfallService.js';
import { syncSlots } from '../services/slotService.js';
import { addDays, dayOfWeek, localDateStr, localHour, monthOf, timeToHours } from '../utils/tz.js';

/*
 * Demo data for Smart Darshan: 3 temples, their staff, devotees, bookings and
 * 90 days of synthetic hourly footfall so the prediction model has history to learn from.
 * All passwords are for local development only.
 */

export const DEMO_PASSWORDS = {
  superadmin: 'Super@123',
  admin: 'Admin@123',
  staff: 'Staff@123',
  devotee: 'Devotee@123',
};

const TIMEZONE = 'Asia/Kolkata';

export const TEMPLES = [
  {
    key: 'venkateswara',
    slug: 'sri-venkateswara-swamy-temple',
    name: 'Sri Venkateswara Swamy Temple',
    deity: 'Lord Venkateswara',
    description: 'A hilltop temple dedicated to Lord Venkateswara, known for its early-morning Suprabhatam seva and large weekend crowds.',
    address: 'Temple Hill Road, Himayatnagar',
    city: 'Hyderabad',
    state: 'Telangana',
    openTime: '05:00',
    closeTime: '21:00',
    popularity: 0.72,
    maxOccupancy: 900,
    majorFestival: 'Brahmotsavam',
    ekadashiOffset: 3,
    darshanTypes: [
      {
        name: 'Sarva Darshan',
        description: 'Free general darshan for all devotees.',
        price: 0,
        slotMinutes: 30,
        capacityPerSlot: 300,
        walkinPercent: 50,
      },
      {
        name: 'Special Entry Darshan',
        description: 'Paid darshan through a separate, faster queue.',
        price: 300,
        slotMinutes: 60,
        capacityPerSlot: 100,
        walkinPercent: 20,
      },
      {
        name: 'Senior Citizen & Differently-abled',
        description: 'Priority lane for devotees above 65, differently-abled devotees and one companion.',
        price: 0,
        slotMinutes: 60,
        capacityPerSlot: 40,
        walkinPercent: 50,
        isPriority: true,
      },
    ],
  },
  {
    key: 'murugan',
    slug: 'arulmigu-murugan-temple',
    name: 'Arulmigu Murugan Temple',
    deity: 'Lord Murugan',
    description: 'A historic shrine of Lord Murugan with vibrant Tuesday and Friday poojas.',
    address: 'Kovil Street, Mylapore',
    city: 'Chennai',
    state: 'Tamil Nadu',
    openTime: '06:00',
    closeTime: '21:00',
    popularity: 0.6,
    maxOccupancy: 600,
    majorFestival: 'Skanda Sashti',
    ekadashiOffset: 5,
    darshanTypes: [
      {
        name: 'General Darshan',
        description: 'Free darshan for all devotees.',
        price: 0,
        slotMinutes: 30,
        capacityPerSlot: 200,
        walkinPercent: 50,
      },
      {
        name: 'Special Darshan',
        description: 'Paid darshan with a shorter queue.',
        price: 150,
        slotMinutes: 60,
        capacityPerSlot: 80,
        walkinPercent: 25,
      },
      {
        name: 'Senior Citizen & Differently-abled',
        description: 'Priority lane with seating and assistance.',
        price: 0,
        slotMinutes: 60,
        capacityPerSlot: 30,
        walkinPercent: 50,
        isPriority: true,
      },
    ],
  },
  {
    key: 'mahalakshmi',
    slug: 'sri-mahalakshmi-temple',
    name: 'Sri Mahalakshmi Temple',
    deity: 'Goddess Mahalakshmi',
    description: 'A serene temple of Goddess Mahalakshmi, especially crowded on Fridays and festival evenings.',
    address: 'Lakshmi Temple Road, Basavanagudi',
    city: 'Bengaluru',
    state: 'Karnataka',
    openTime: '05:30',
    closeTime: '21:30',
    popularity: 0.5,
    maxOccupancy: 500,
    majorFestival: 'Varalakshmi Vratham',
    ekadashiOffset: 9,
    darshanTypes: [
      { name: 'Dharma Darshan', description: 'Free general darshan.', price: 0, slotMinutes: 30, capacityPerSlot: 180, walkinPercent: 40 },
      {
        name: 'Special Darshan',
        description: 'Paid darshan through the east gate.',
        price: 200,
        slotMinutes: 60,
        capacityPerSlot: 60,
        walkinPercent: 20,
      },
      {
        name: 'Senior Citizen & Differently-abled',
        description: 'Priority lane near the main gate.',
        price: 0,
        slotMinutes: 60,
        capacityPerSlot: 24,
        walkinPercent: 50,
        isPriority: true,
      },
    ],
  },
];

const FIRST_NAMES = [
  'Aarav',
  'Ananya',
  'Rohan',
  'Lakshmi',
  'Karthik',
  'Meera',
  'Vikram',
  'Divya',
  'Suresh',
  'Priya',
  'Arjun',
  'Kavya',
  'Rahul',
  'Sneha',
  'Ganesh',
  'Pooja',
  'Harish',
  'Nandini',
  'Sanjay',
  'Revathi',
  'Mohan',
  'Swathi',
  'Ravi',
  'Deepa',
];
const LAST_NAMES = ['Reddy', 'Iyer', 'Sharma', 'Rao', 'Nair', 'Kumar', 'Menon', 'Patel', 'Gowda', 'Pillai', 'Naidu', 'Krishnan'];

// Share of peak crowd expected in each hour of the day (0-23).
const HOUR_PROFILE = [
  0.08, 0.06, 0.05, 0.08, 0.3, 0.62, 0.92, 1, 0.9, 0.75, 0.62, 0.52, 0.45, 0.36, 0.34, 0.42, 0.58, 0.8, 0.98, 0.95, 0.7, 0.45, 0.28, 0.15,
];
// Sunday..Saturday.
const DAY_FACTOR = [1.35, 0.82, 0.88, 0.92, 0.98, 1.12, 1.3];

/** Small deterministic PRNG so the demo data is the same on every seed. */
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

function buildFestivals(def, today) {
  const festivals = [];
  for (let offset = -90 + def.ekadashiOffset; offset <= 30; offset += 15) {
    festivals.push({ name: 'Ekadashi', date: addDays(today, offset) });
  }
  for (let i = 0; i < 3; i += 1) {
    festivals.push({ name: def.majorFestival, date: addDays(today, -41 + i) });
  }
  return festivals.sort((a, b) => a.date.localeCompare(b.date));
}

function hourlyCapacityOf(def) {
  return def.darshanTypes.reduce((sum, dt) => sum + (dt.capacityPerSlot * 60) / dt.slotMinutes, 0);
}

/**
 * Synthetic hourly footfall for every day in [fromDate, toDate].
 * `toDate` is treated as today, so only the hours that have already finished are produced.
 */
export function generateFootfallRange(temple, def, { fromDate, toDate, currentHour, seed }) {
  const random = mulberry32(seed);
  const capacity = hourlyCapacityOf(def);
  const open = timeToHours(temple.openTime);
  const close = timeToHours(temple.closeTime);
  const logs = [];

  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    const dow = dayOfWeek(date);
    const festival = temple.isFestivalDate(date);
    const season = 1 + 0.08 * Math.sin((monthOf(date) / 12) * 2 * Math.PI);

    const lastHour = date === toDate ? Math.min(Math.ceil(close), currentHour) : Math.ceil(close);
    for (let hour = Math.floor(open); hour < lastHour; hour += 1) {
      const openFraction = Math.min(1, close - hour, hour + 1 - open);
      const expected = capacity * def.popularity * HOUR_PROFILE[hour] * DAY_FACTOR[dow] * season * (festival ? 1.75 : 1) * openFraction;
      const limit = capacity * (festival ? temple.settings.festivalCapacityMultiplier : 1) * 1.05;
      const entries = Math.round(Math.min(limit, expected * (0.85 + random() * 0.3)));
      const exits = Math.round(entries * (0.93 + random() * 0.07));
      logs.push({ templeId: temple._id, date, hour, dayOfWeek: dow, isFestival: festival, entries, exits });
    }
  }
  return logs;
}

/** Past days in full, plus today's hours that have already finished. */
function generateFootfall(temple, def, today, currentHour, historyDays, seed) {
  return generateFootfallRange(temple, def, { fromDate: addDays(today, -historyDays), toDate: today, currentHour, seed });
}

/**
 * Fills a temple's "right now" picture: online bookings for today and tomorrow,
 * plus a handful of walk-ins already standing in the queue.
 */
export async function createDemoActivity({ temple, devotees, staff, now, random }) {
  const today = localDateStr(now, temple.timezone);
  const pick = (list) => list[Math.floor(random() * list.length)];
  let bookings = 0;

  for (const date of [today, addDays(today, 1)]) {
    const slots = await Slot.find({ templeId: temple._id, date, endAt: { $gt: new Date(now.getTime() + 15 * 60_000) } }).lean();
    if (!slots.length) continue;
    for (const devotee of devotees) {
      const slot = pick(slots);
      try {
        await createOnlineBooking(devotee, { slotId: slot._id, groupSize: 1 + Math.floor(random() * 4), name: devotee.name }, { silent: true });
        bookings += 1;
      } catch {
        /* slot full or limit reached; skip */
      }
    }
  }

  // A few people already in the queue right now (only if the temple is open).
  const walkinSlots = await Slot.countDocuments({ templeId: temple._id, date: today, startAt: { $lte: now }, endAt: { $gt: now } });
  let inQueue = 0;
  if (walkinSlots) {
    const lanes = temple.darshanTypes;
    for (let i = 0; i < 18; i += 1) {
      const lane = i < 12 ? lanes[0] : i < 16 ? lanes[1] : lanes[2];
      try {
        const { token } = await createWalkin(
          staff,
          temple,
          { darshanTypeId: lane._id, groupSize: 1 + Math.floor(random() * 4), name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}` },
          { silent: true },
        );
        if (token.slotStartAt > now) continue;
        const checkedInAt = new Date(now.getTime() - (18 - i) * 60_000);
        await Token.updateOne({ _id: token._id }, { $set: { status: 'checked_in', checkedInAt, checkedInBy: staff._id } });
        await recordFootfall(temple, checkedInAt, { entries: token.groupSize });
        inQueue += token.groupSize;
      } catch {
        /* no walk-in room; skip */
      }
    }
  }

  return { bookings, inQueue };
}

/** The demo devotee's own bookings: the next open slot at the first temple, and one tomorrow at the second. */
export async function createDemoDevoteeBookings(demoDevotee, now) {
  const [firstTemple, secondTemple] = await Temple.find().sort({ createdAt: 1 }).limit(2);
  const demoBookings = [
    { temple: firstTemple, date: localDateStr(now, firstTemple.timezone), groupSize: 3 },
    { temple: secondTemple, date: addDays(localDateStr(now, secondTemple.timezone), 1), groupSize: 2 },
  ];
  for (const booking of demoBookings) {
    if (!booking.temple) continue;
    const slot = await Slot.findOne({
      templeId: booking.temple._id,
      darshanTypeId: booking.temple.darshanTypes[0]._id,
      date: booking.date,
      startAt: { $gt: now },
    }).sort({ startAt: 1 });
    if (!slot) continue;
    try {
      await createOnlineBooking(
        demoDevotee,
        { slotId: slot._id, groupSize: booking.groupSize, name: demoDevotee.name, phone: demoDevotee.phone },
        { silent: true },
      );
    } catch {
      /* ignore */
    }
  }
}

async function createUser({ name, email, phone, role, templeId, password }) {
  const user = new User({ name, email, phone, role, templeId });
  await user.setPassword(password);
  return user.save();
}

export async function clearDatabase() {
  await Promise.all([
    Alert.deleteMany({}),
    Announcement.deleteMany({}),
    FootfallLog.deleteMany({}),
    Slot.deleteMany({}),
    Temple.deleteMany({}),
    Token.deleteMany({}),
    User.deleteMany({}),
  ]);
}

export async function seedDatabase({ reset = false, allDay = false, historyDays = 90, log = console.log } = {}) {
  if (reset) await clearDatabase();

  // DEMO_PASSWORD (required in production) replaces the public demo passwords for every account.
  const passwords = env.demoPassword
    ? Object.fromEntries(Object.keys(DEMO_PASSWORDS).map((role) => [role, env.demoPassword]))
    : DEMO_PASSWORDS;
  const shown = (password) => (env.demoPassword ? '(DEMO_PASSWORD)' : password);

  const now = new Date();
  const random = mulberry32(2026);
  const pick = (list) => list[Math.floor(random() * list.length)];

  await createUser({
    name: 'Platform Superadmin',
    email: 'superadmin@smartdarshan.in',
    role: 'superadmin',
    password: passwords.superadmin,
  });
  const demoDevotee = await createUser({
    name: 'Demo Devotee',
    email: 'devotee@smartdarshan.in',
    phone: '+919876543210',
    role: 'devotee',
    password: passwords.devotee,
  });

  const devotees = [];
  for (let i = 1; i <= 24; i += 1) {
    devotees.push(
      await createUser({
        name: `${FIRST_NAMES[i - 1]} ${pick(LAST_NAMES)}`,
        email: `devotee${i}@example.com`,
        role: 'devotee',
        password: passwords.devotee,
      }),
    );
  }

  const credentials = [
    { role: 'superadmin', email: 'superadmin@smartdarshan.in', password: shown(passwords.superadmin), temple: 'All temples' },
    { role: 'devotee', email: 'devotee@smartdarshan.in', password: shown(passwords.devotee), temple: '-' },
  ];

  for (const [index, def] of TEMPLES.entries()) {
    const today = localDateStr(now, TIMEZONE);

    const temple = await Temple.create({
      name: def.name,
      slug: def.slug,
      timezone: TIMEZONE,
      deity: def.deity,
      description: def.description,
      address: def.address,
      city: def.city,
      state: def.state,
      openTime: allDay ? '00:00' : def.openTime,
      closeTime: allDay ? '24:00' : def.closeTime,
      darshanTypes: def.darshanTypes,
      settings: { maxOccupancy: def.maxOccupancy },
      festivals: buildFestivals(def, today),
    });

    const admin = await createUser({
      name: `${def.city} Temple Admin`,
      email: `admin.${def.key}@smartdarshan.in`,
      phone: `+91900000000${index + 1}`,
      role: 'admin',
      templeId: temple._id,
      password: passwords.admin,
    });
    const staff = await createUser({
      name: `${def.city} Gate Staff`,
      email: `staff.${def.key}@smartdarshan.in`,
      phone: `+91900000001${index + 1}`,
      role: 'staff',
      templeId: temple._id,
      password: passwords.staff,
    });
    credentials.push(
      { role: 'admin', email: admin.email, password: shown(passwords.admin), temple: def.name },
      { role: 'staff', email: staff.email, password: shown(passwords.staff), temple: def.name },
    );

    const footfall = generateFootfall(temple, def, today, localHour(now, TIMEZONE), historyDays, 1000 + index);
    await FootfallLog.insertMany(footfall, { ordered: false });

    const slotResult = await syncSlots(temple);

    await Announcement.create([
      { templeId: temple._id, message: 'Mobile phones must be switched off inside the sanctum.', type: 'info', createdBy: admin._id },
      {
        templeId: temple._id,
        message: 'Free drinking water and footwear counters are available near Gate 2.',
        type: 'info',
        createdBy: admin._id,
      },
    ]);

    const { bookings, inQueue } = await createDemoActivity({ temple, devotees, staff, now, random });

    log(
      `[seed] ${def.name}: ${footfall.length} footfall records, ${slotResult.created} slots, ${bookings} bookings, ${inQueue} people in queue`,
    );
  }

  await createDemoDevoteeBookings(demoDevotee, now);

  log('[seed] demo accounts:');
  console.table(credentials);
  return credentials;
}
