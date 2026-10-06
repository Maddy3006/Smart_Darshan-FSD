import FootfallLog from '../models/FootfallLog.js';
import { dayOfWeek, localDateStr, localHour } from '../utils/tz.js';

/** Adds entries/exits to the temple's hourly footfall log (the ML training data). */
export async function recordFootfall(temple, at, { entries = 0, exits = 0 }) {
  const date = localDateStr(at, temple.timezone);
  const hour = localHour(at, temple.timezone);

  await FootfallLog.updateOne(
    { templeId: temple._id, date, hour },
    {
      $inc: { entries, exits },
      $setOnInsert: { dayOfWeek: dayOfWeek(date), isFestival: temple.isFestivalDate(date) },
    },
    { upsert: true },
  );
}
