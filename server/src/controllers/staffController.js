import Slot from '../models/Slot.js';
import Token from '../models/Token.js';
import { createWalkin } from '../services/bookingService.js';
import { getSnapshot } from '../services/liveStats.js';
import { scanToken } from '../services/scanService.js';
import { serializeSlot } from '../services/slotService.js';
import { serializeToken } from '../services/tokenView.js';
import { escapeRegex } from '../utils/helpers.js';
import { localDateStr } from '../utils/tz.js';

const MINUTE = 60_000;

/** Everything a gate / counter device needs about its temple. */
export async function context(req, res) {
  const { temple } = req;
  res.json({
    temple: {
      ...temple.toPublicJSON(),
      controls: temple.controls,
    },
    live: await getSnapshot(temple._id),
  });
}

export async function walkinSlots(req, res) {
  const { temple } = req;
  const now = new Date();
  const today = localDateStr(now, temple.timezone);
  const filter = { templeId: temple._id, date: today, endAt: { $gt: new Date(now.getTime() + 5 * MINUTE) } };
  if (req.valid.query.darshanTypeId) filter.darshanTypeId = req.valid.query.darshanTypeId;

  const slots = await Slot.find(filter).sort({ startAt: 1 }).lean();
  res.json({ date: today, slots: slots.map((slot) => serializeSlot(slot, temple, now)) });
}

export async function issueWalkin(req, res) {
  const { token } = await createWalkin(req.user, req.temple, req.valid.body);
  res.status(201).json({ token: serializeToken(token, req.temple, { full: true }) });
}

export async function scan(req, res) {
  const { code, action } = req.valid.body;
  const token = await scanToken({ staff: req.user, temple: req.temple, rawCode: code, action });
  res.json({
    ok: true,
    message: action === 'entry' ? 'Entry recorded' : 'Exit recorded',
    token: serializeToken(token, req.temple, { full: true }),
  });
}

export async function listTokens(req, res) {
  const { temple } = req;
  const { status, q, enterable, sort, limit, source } = req.valid.query;
  const now = new Date();
  const filter = { templeId: temple._id };

  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }, { phone: pattern }];
  } else {
    filter.slotDate = localDateStr(now, temple.timezone);
  }
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (enterable) {
    filter.status = 'booked';
    filter.slotStartAt = { $lte: new Date(now.getTime() + temple.settings.checkinEarlyMin * MINUTE) };
    filter.slotEndAt = { $gte: new Date(now.getTime() - temple.settings.checkinLateMin * MINUTE) };
  }

  const sortBy = {
    recent: { updatedAt: -1 },
    oldest: { checkedInAt: 1, createdAt: 1 },
    slot: { slotStartAt: 1 },
  }[sort];

  const tokens = await Token.find(filter).sort(sortBy).limit(limit);
  res.json({ tokens: tokens.map((t) => serializeToken(t, temple, { full: true })) });
}
