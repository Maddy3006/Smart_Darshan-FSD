import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { getSnapshot } from '../services/liveStats.js';
import { syncSlots } from '../services/slotService.js';
import AppError from '../utils/AppError.js';
import { normalizePhone, slugify } from '../utils/helpers.js';

export const DEFAULT_DARSHAN_TYPES = [
  {
    name: 'Sarva Darshan',
    description: 'Free general darshan for all devotees.',
    price: 0,
    slotMinutes: 30,
    capacityPerSlot: 200,
    walkinPercent: 50,
  },
  {
    name: 'Special Entry Darshan',
    description: 'Paid darshan with a shorter, separate queue.',
    price: 300,
    slotMinutes: 60,
    capacityPerSlot: 80,
    walkinPercent: 20,
  },
  {
    name: 'Senior Citizen & Differently-abled',
    description: 'Priority lane for devotees above 65, differently-abled devotees and one companion.',
    price: 0,
    slotMinutes: 60,
    capacityPerSlot: 30,
    walkinPercent: 50,
    isPriority: true,
  },
];

export async function listTemples(_req, res) {
  const temples = await Temple.find().sort({ createdAt: 1 });
  const admins = await User.find({ role: 'admin', templeId: { $in: temples.map((t) => t._id) } }, 'name email templeId');

  const rows = await Promise.all(
    temples.map(async (temple) => {
      const live = temple.isActive ? await getSnapshot(temple._id, { maxAgeMs: 30_000 }).catch(() => null) : null;
      return {
        _id: temple._id,
        name: temple.name,
        slug: temple.slug,
        city: temple.city,
        state: temple.state,
        isActive: temple.isActive,
        darshanTypes: temple.darshanTypes.length,
        admins: admins.filter((a) => String(a.templeId) === String(temple._id)),
        live: live && { inQueue: live.totals.inQueue, enteredToday: live.totals.enteredToday, occupancyPct: live.totals.occupancyPct },
      };
    }),
  );
  res.json({ temples: rows });
}

export async function createTemple(req, res) {
  const { admin, ...profile } = req.valid.body;
  const slug = slugify(profile.slug || profile.name);
  if (await Temple.exists({ slug })) throw new AppError(409, 'A temple with this name/slug already exists');
  if (await User.exists({ email: admin.email })) throw new AppError(409, 'The admin email is already registered');

  const temple = await Temple.create({ ...profile, slug, darshanTypes: DEFAULT_DARSHAN_TYPES });
  const adminUser = new User({
    name: admin.name,
    email: admin.email,
    phone: normalizePhone(admin.phone) || undefined,
    role: 'admin',
    templeId: temple._id,
  });
  await adminUser.setPassword(admin.password);
  try {
    await adminUser.save();
  } catch (err) {
    await Temple.deleteOne({ _id: temple._id });
    throw err;
  }

  const slotSync = await syncSlots(temple);
  res.status(201).json({ temple, admin: adminUser, slotSync });
}

export async function updateTempleStatus(req, res) {
  const temple = await Temple.findByIdAndUpdate(
    req.params.templeId,
    { $set: { isActive: req.valid.body.isActive } },
    { returnDocument: 'after' },
  );
  if (!temple) throw new AppError(404, 'Temple not found');
  res.json({ temple });
}

export async function overview(_req, res) {
  const [temples, devotees, staff, tokensToday] = await Promise.all([
    Temple.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'devotee' }),
    User.countDocuments({ role: { $in: ['staff', 'admin'] } }),
    Token.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 3600_000) } }),
  ]);
  res.json({ overview: { temples, devotees, staff, tokensLast24h: tokensToday } });
}
