import cron from 'node-cron';
import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import { trainTempleModel } from '../services/forecastService.js';
import { recordFootfall } from '../services/footfallService.js';
import { publishSnapshot, schedulePublish } from '../services/liveStats.js';
import { mlHealth } from '../services/mlClient.js';
import { emitTokenChanged, notifyTokenHolder } from '../services/notificationService.js';
import { syncSlots } from '../services/slotService.js';
import { formatTime } from '../utils/tz.js';

const MINUTE = 60_000;

function safely(name, task) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.error(`[job:${name}] ${err.message}`);
    } finally {
      running = false;
    }
  };
}

const activeTemples = () => Temple.find({ isActive: true });

/** Expires missed bookings, closes out stale queue entries, and sends slot reminders. */
export async function tokenMaintenance() {
  const now = new Date();

  for (const temple of await activeTemples()) {
    const { checkinLateMin, autoCompleteAfterMin, reminderBeforeMin } = temple.settings;
    let changed = false;

    const missed = await Token.find({
      templeId: temple._id,
      status: 'booked',
      slotEndAt: { $lt: new Date(now.getTime() - checkinLateMin * MINUTE) },
    });
    for (const token of missed) {
      token.status = 'expired';
      token.expiredAt = now;
      await token.save();
      emitTokenChanged(token);
      notifyTokenHolder(token, {
        title: 'Token expired',
        message: `Token ${token.code} expired because the slot was missed.`,
        level: 'warning',
      });
      changed = true;
    }

    const stale = await Token.find({
      templeId: temple._id,
      status: 'checked_in',
      checkedInAt: { $lt: new Date(now.getTime() - autoCompleteAfterMin * MINUTE) },
    });
    for (const token of stale) {
      token.status = 'completed';
      token.completedAt = now;
      token.autoCompleted = true;
      await token.save();
      await recordFootfall(temple, now, { exits: token.groupSize });
      emitTokenChanged(token);
      changed = true;
    }

    const dueReminders = await Token.find({
      templeId: temple._id,
      status: 'booked',
      reminderSentAt: { $exists: false },
      slotStartAt: { $gt: now, $lte: new Date(now.getTime() + reminderBeforeMin * MINUTE) },
    });
    for (const token of dueReminders) {
      token.reminderSentAt = now;
      await token.save();
      notifyTokenHolder(token, {
        title: 'Your darshan slot is coming up',
        message: `Token ${token.code}: ${token.darshanTypeName} at ${temple.name} starts at ${formatTime(token.slotStartAt, temple.timezone)}. Please reach the entry gate on time.`,
        sms: true,
      });
    }

    if (changed) schedulePublish(temple._id);
  }
}

export async function syncAllTemples() {
  for (const temple of await activeTemples()) {
    const result = await syncSlots(temple);
    if (result.created || result.removed) {
      console.log(`[slots] ${temple.name}: +${result.created} created, ${result.removed} removed`);
    }
  }
}

export async function publishAllSnapshots() {
  for (const temple of await activeTemples()) await publishSnapshot(temple);
}

export async function trainModels({ onlyUntrained = false } = {}) {
  const health = await mlHealth();
  if (!health.online) {
    console.log('[ml] prediction service offline; forecasts will use historical averages');
    return;
  }
  for (const temple of await activeTemples()) {
    if (onlyUntrained && temple.mlModel?.trainedAt) continue;
    try {
      const model = await trainTempleModel(temple);
      console.log(`[ml] trained ${temple.name}: R2=${model.r2}, MAE=${model.mae}, samples=${model.samples}`);
    } catch (err) {
      console.log(`[ml] could not train ${temple.name}: ${err.message}`);
    }
  }
}

export function startJobs() {
  cron.schedule('* * * * *', safely('tokens', tokenMaintenance));
  cron.schedule('5 * * * *', safely('slots', syncAllTemples));
  // New temples (or a service that was offline at startup) get a model within the hour.
  cron.schedule(
    '20 * * * *',
    safely('ml-untrained', () => trainModels({ onlyUntrained: true })),
  );
  cron.schedule(
    '30 2 * * *',
    safely('ml-retrain', () => trainModels()),
  );
  setInterval(safely('live', publishAllSnapshots), 30_000);

  void safely('slots', syncAllTemples)();
  setTimeout(
    safely('ml-initial', () => trainModels({ onlyUntrained: true })),
    5_000,
  );
}
