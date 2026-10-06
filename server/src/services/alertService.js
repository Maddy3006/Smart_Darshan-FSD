import Alert from '../models/Alert.js';
import Temple from '../models/Temple.js';
import { emitTo } from '../sockets/index.js';

const SEVERITY = { normal: 0, warning: 1, critical: 2 };
const lastLevels = new Map();

export async function raiseAlert(templeId, { level, message, occupancyPct }) {
  const alert = await Alert.create({ templeId, level, message, occupancyPct });
  emitTo(`admin:${templeId}`, 'alert:new', alert);
  return alert;
}

/**
 * Raises an alert when the queue crosses 90% (warning) or 100% (critical) of the
 * temple's safe occupancy. Only escalations alert, so admins aren't spammed.
 * Optionally pauses entry automatically at 100%.
 */
export async function checkOccupancy(temple, snapshot) {
  const key = String(temple._id);
  const pct = snapshot.totals.occupancyPct;
  const level = pct >= 100 ? 'critical' : pct >= 90 ? 'warning' : 'normal';
  const previous = lastLevels.get(key) ?? 'normal';
  lastLevels.set(key, level);

  if (SEVERITY[level] <= SEVERITY[previous]) return;

  const { inQueue, maxOccupancy } = snapshot.totals;
  await raiseAlert(temple._id, {
    level,
    occupancyPct: pct,
    message:
      level === 'critical'
        ? `Queue is at full capacity: ${inQueue} people waiting (limit ${maxOccupancy}).`
        : `Queue is nearing capacity: ${inQueue} of ${maxOccupancy} (${pct}%).`,
  });

  if (level === 'critical' && temple.settings.autoPauseAtCapacity && !temple.controls.entryPaused) {
    await Temple.updateOne(
      { _id: temple._id },
      {
        $set: {
          'controls.entryPaused': true,
          'controls.pauseReason': 'Queue at full capacity. Entry will resume shortly.',
          'controls.pausedAt': new Date(),
        },
      },
    );
    await raiseAlert(temple._id, { level: 'info', message: 'Entry was paused automatically. Resume it from the dashboard.' });
    const { schedulePublish } = await import('./liveStats.js');
    schedulePublish(temple._id);
  }
}
