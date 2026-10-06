import Announcement from '../models/Announcement.js';
import Slot from '../models/Slot.js';
import Temple from '../models/Temple.js';
import { getForecast } from '../services/forecastService.js';
import { getSnapshot } from '../services/liveStats.js';
import { serializeSlot } from '../services/slotService.js';
import AppError from '../utils/AppError.js';
import { escapeRegex, isObjectId } from '../utils/helpers.js';
import { addDays, localDateStr } from '../utils/tz.js';

async function findActiveTemple(idOrSlug) {
  const filter = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  const temple = await Temple.findOne({ ...filter, isActive: true });
  if (!temple) throw new AppError(404, 'Temple not found');
  return temple;
}

export async function listTemples(req, res) {
  const { q, city } = req.valid.query;
  const filter = { isActive: true };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { city: pattern }, { deity: pattern }, { state: pattern }];
  }
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');

  const temples = await Temple.find(filter).sort({ name: 1 });
  const withLive = await Promise.all(
    temples.map(async (temple) => {
      const live = await getSnapshot(temple._id, { maxAgeMs: 30_000 }).catch(() => null);
      return {
        ...temple.toPublicJSON(),
        live: live && {
          isOpen: live.isOpen,
          entryPaused: live.entryPaused,
          inQueue: live.totals.inQueue,
          generalWaitMin: live.totals.generalWaitMin,
          occupancyPct: live.totals.occupancyPct,
          festival: live.festival,
        },
      };
    }),
  );
  const cities = await Temple.distinct('city', { isActive: true });
  res.json({ temples: withLive, cities: cities.sort() });
}

export async function getTemple(req, res) {
  const temple = await findActiveTemple(req.params.idOrSlug);
  res.json({ temple: temple.toPublicJSON() });
}

export async function getSlots(req, res) {
  const temple = await findActiveTemple(req.params.idOrSlug);
  const today = localDateStr(new Date(), temple.timezone);
  const date = req.valid.query.date || today;
  const lastDate = addDays(today, temple.settings.bookingWindowDays - 1);
  if (date < today || date > lastDate) {
    throw new AppError(400, `Slots are available from ${today} to ${lastDate}`, 'DATE_OUT_OF_RANGE');
  }

  const filter = { templeId: temple._id, date };
  if (req.valid.query.darshanTypeId) filter.darshanTypeId = req.valid.query.darshanTypeId;

  const now = new Date();
  const slots = await Slot.find(filter).sort({ startAt: 1 }).lean();
  res.json({
    date,
    today,
    lastDate,
    festival: temple.festivalName(date),
    slots: slots.map((slot) => serializeSlot(slot, temple, now)),
  });
}

export async function getLive(req, res) {
  const temple = await findActiveTemple(req.params.idOrSlug);
  res.json({ live: await getSnapshot(temple._id) });
}

export async function getTempleForecast(req, res) {
  const temple = await findActiveTemple(req.params.idOrSlug);
  const today = localDateStr(new Date(), temple.timezone);
  const date = req.valid.query.date || today;
  res.json({ forecast: await getForecast(temple, date) });
}

export async function getAnnouncements(req, res) {
  const temple = await findActiveTemple(req.params.idOrSlug);
  const announcements = await Announcement.find({ templeId: temple._id, isActive: true }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ announcements });
}
