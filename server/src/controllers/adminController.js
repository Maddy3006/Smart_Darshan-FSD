import Alert from '../models/Alert.js';
import Announcement from '../models/Announcement.js';
import Slot from '../models/Slot.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { clearForecastCache, getForecast, trainTempleModel } from '../services/forecastService.js';
import { schedulePublish } from '../services/liveStats.js';
import { mlHealth } from '../services/mlClient.js';
import { serializeSlot, syncSlots } from '../services/slotService.js';
import { todayStats, trendStats } from '../services/statsService.js';
import { emitTo } from '../sockets/index.js';
import AppError from '../utils/AppError.js';
import { normalizePhone } from '../utils/helpers.js';
import { addDays, localDateStr } from '../utils/tz.js';

/* ---------- Temple profile & settings ---------- */

export async function getTemple(req, res) {
  res.json({ temple: req.temple });
}

export async function updateTemple(req, res) {
  const { temple } = req;
  const { settings, festivals, ...profile } = req.valid.body;

  Object.assign(temple, profile);
  if (settings) Object.assign(temple.settings, settings);
  if (festivals) temple.festivals = festivals;
  await temple.save();

  const timingsChanged = ['openTime', 'closeTime', 'timezone'].some((f) => f in profile);
  const slotResult = timingsChanged || festivals || settings ? await syncSlots(temple) : null;
  clearForecastCache(temple._id);
  schedulePublish(temple._id);
  res.json({ temple, slotSync: slotResult });
}

export async function addDarshanType(req, res) {
  const { temple } = req;
  temple.darshanTypes.push(req.valid.body);
  await temple.save();
  const slotSync = await syncSlots(temple);
  schedulePublish(temple._id);
  res.status(201).json({ temple, slotSync });
}

export async function updateDarshanType(req, res) {
  const { temple } = req;
  const darshanType = temple.darshanTypes.id(req.params.darshanTypeId);
  if (!darshanType) throw new AppError(404, 'Darshan type not found');
  Object.assign(darshanType, req.valid.body);
  await temple.save();
  const slotSync = await syncSlots(temple);
  schedulePublish(temple._id);
  res.json({ temple, slotSync });
}

/* ---------- Slots ---------- */

export async function runSlotSync(req, res) {
  res.json({ result: await syncSlots(req.temple, { days: req.valid.body.days }) });
}

export async function listSlots(req, res) {
  const { temple } = req;
  const date = req.valid.query.date || localDateStr(new Date(), temple.timezone);
  const [slots, checkins] = await Promise.all([
    Slot.find({ templeId: temple._id, date }).sort({ startAt: 1 }).lean(),
    Token.aggregate([
      { $match: { templeId: temple._id, slotDate: date } },
      { $group: { _id: { slotId: '$slotId', status: '$status' }, people: { $sum: '$groupSize' } } },
    ]),
  ]);
  const now = new Date();
  res.json({
    date,
    slots: slots.map((slot) => {
      const counts = Object.fromEntries(
        checkins.filter((c) => String(c._id.slotId) === String(slot._id)).map((c) => [c._id.status, c.people]),
      );
      return { ...serializeSlot(slot, temple, now), people: counts };
    }),
  });
}

/* ---------- Live crowd controls ---------- */

export async function updateControls(req, res) {
  const { temple } = req;
  const { entryPaused, pauseReason } = req.valid.body;
  temple.controls.entryPaused = entryPaused;
  temple.controls.pauseReason = entryPaused ? pauseReason || 'Temporarily paused for crowd control' : '';
  temple.controls.pausedAt = entryPaused ? new Date() : undefined;
  await temple.save();
  schedulePublish(temple._id, 0);
  res.json({ controls: temple.controls });
}

/* ---------- Announcements ---------- */

export async function listAnnouncements(req, res) {
  const announcements = await Announcement.find({ templeId: req.temple._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('createdBy', 'name');
  res.json({ announcements });
}

export async function createAnnouncement(req, res) {
  const announcement = await Announcement.create({
    ...req.valid.body,
    templeId: req.temple._id,
    createdBy: req.user._id,
  });
  emitTo(`temple:${req.temple._id}`, 'announcement:new', announcement);
  res.status(201).json({ announcement });
}

export async function updateAnnouncement(req, res) {
  const announcement = await Announcement.findOneAndUpdate(
    { _id: req.params.announcementId, templeId: req.temple._id },
    { $set: req.valid.body },
    { returnDocument: 'after' },
  );
  if (!announcement) throw new AppError(404, 'Announcement not found');
  emitTo(`temple:${req.temple._id}`, 'announcement:update', announcement);
  res.json({ announcement });
}

/* ---------- Staff accounts ---------- */

export async function listStaff(req, res) {
  const staff = await User.find({ templeId: req.temple._id, role: { $in: ['staff', 'admin'] } }).sort({ role: 1, name: 1 });
  res.json({ staff });
}

export async function createStaff(req, res) {
  const { name, email, phone, password, role } = req.valid.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');

  const user = new User({ name, email, phone: normalizePhone(phone) || undefined, role, templeId: req.temple._id });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ user });
}

export async function updateStaff(req, res) {
  const user = await User.findOne({ _id: req.params.userId, templeId: req.temple._id, role: { $in: ['staff', 'admin'] } });
  if (!user) throw new AppError(404, 'Staff member not found');
  if (String(user._id) === String(req.user._id) && req.valid.body.isActive === false) {
    throw new AppError(400, 'You cannot deactivate your own account');
  }
  const { password, ...changes } = req.valid.body;
  if (changes.phone !== undefined) changes.phone = normalizePhone(changes.phone) || undefined;
  Object.assign(user, changes);
  if (password) await user.setPassword(password);
  await user.save();
  res.json({ user });
}

/* ---------- Analytics & prediction ---------- */

export async function statsToday(req, res) {
  res.json({ stats: await todayStats(req.temple) });
}

export async function statsTrends(req, res) {
  res.json({ trends: await trendStats(req.temple, req.valid.query.days) });
}

export async function weekForecast(req, res) {
  const { temple } = req;
  const today = localDateStr(new Date(), temple.timezone);
  const days = await Promise.all(Array.from({ length: 7 }, (_, i) => getForecast(temple, addDays(today, i))));
  res.json({
    days: days.map((f) => ({
      date: f.date,
      festival: f.festival,
      expectedTotal: f.expectedTotal,
      peakHour: f.peakHour,
      recommendedHours: f.recommendedHours,
      source: f.source,
      hours: f.hours,
    })),
  });
}

export async function modelStatus(req, res) {
  res.json({ model: req.temple.mlModel?.trainedAt ? req.temple.mlModel : null, service: await mlHealth() });
}

export async function trainModel(req, res) {
  res.json({ model: await trainTempleModel(req.temple) });
}

/* ---------- Alerts ---------- */

export async function listAlerts(req, res) {
  const alerts = await Alert.find({ templeId: req.temple._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ alerts, unacknowledged: alerts.filter((a) => !a.acknowledged).length });
}

export async function acknowledgeAlerts(req, res) {
  await Alert.updateMany({ templeId: req.temple._id, acknowledged: false }, { $set: { acknowledged: true } });
  res.json({ ok: true });
}
