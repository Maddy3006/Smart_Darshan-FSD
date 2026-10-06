import FootfallLog from '../models/FootfallLog.js';
import Temple from '../models/Temple.js';
import AppError from '../utils/AppError.js';
import { dayOfWeek, localDateStr, localHour, monthOf, timeToHours } from '../utils/tz.js';
import { mlPredict, mlTrain } from './mlClient.js';

const CACHE_TTL_MS = 10 * 60_000;
const MIN_TRAINING_ROWS = 100;
const cache = new Map();

export function clearForecastCache(templeId) {
  for (const key of cache.keys()) if (key.startsWith(`${templeId}:`)) cache.delete(key);
}

/** People per hour the temple is designed to handle (all active lanes combined). */
export function hourlyCapacity(temple, dateStr) {
  const multiplier = temple.isFestivalDate(dateStr) ? temple.settings.festivalCapacityMultiplier : 1;
  return Math.round(
    temple.darshanTypes.filter((dt) => dt.active).reduce((sum, dt) => sum + (dt.capacityPerSlot * 60) / dt.slotMinutes, 0) * multiplier,
  );
}

function openHours(temple) {
  const first = Math.floor(timeToHours(temple.openTime));
  const last = Math.ceil(timeToHours(temple.closeTime));
  return Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i);
}

function crowdLevel(loadPct) {
  if (loadPct < 45) return 'low';
  if (loadPct < 80) return 'moderate';
  return 'high';
}

/** Fallback when the Python service is offline: average of past footfall for the same weekday and hour. */
async function historicalAverage(temple, rows) {
  const averages = await FootfallLog.aggregate([
    { $match: { templeId: temple._id } },
    {
      $group: {
        _id: { dow: '$dayOfWeek', hour: '$hour', festival: '$isFestival' },
        avg: { $avg: '$entries' },
      },
    },
  ]);
  const lookup = new Map(averages.map((a) => [`${a._id.dow}|${a._id.hour}|${a._id.festival}`, a.avg]));
  const byHour = new Map();
  for (const a of averages) {
    const list = byHour.get(a._id.hour) || [];
    list.push(a.avg);
    byHour.set(a._id.hour, list);
  }

  return rows.map((row) => {
    const festival = Boolean(row.isFestival);
    const exact = lookup.get(`${row.dayOfWeek}|${row.hour}|${festival}`);
    if (exact !== undefined) return exact;
    const sameDay = lookup.get(`${row.dayOfWeek}|${row.hour}|false`);
    if (sameDay !== undefined) return festival ? sameDay * 1.8 : sameDay;
    const hourValues = byHour.get(row.hour) || [];
    return hourValues.length ? hourValues.reduce((s, v) => s + v, 0) / hourValues.length : 0;
  });
}

const trainingInProgress = new Set();

function retrainInBackground(temple) {
  const key = String(temple._id);
  if (trainingInProgress.has(key)) return;
  trainingInProgress.add(key);
  trainTempleModel(temple)
    .then((model) => console.log(`[ml] trained missing model for ${temple.name}: R2=${model.r2}`))
    .catch((err) => console.log(`[ml] could not train ${temple.name}: ${err.message}`))
    .finally(() => setTimeout(() => trainingInProgress.delete(key), 10 * 60_000));
}

/**
 * Hour-by-hour crowd forecast for a date, plus the least crowded hours to visit.
 * Uses the trained scikit-learn model, or historical averages if it is unavailable.
 */
export async function getForecast(temple, dateStr) {
  const key = `${temple._id}:${dateStr}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const isFestival = temple.isFestivalDate(dateStr);
  const hours = openHours(temple);
  const rows = hours.map((hour) => ({
    hour,
    dayOfWeek: dayOfWeek(dateStr),
    month: monthOf(dateStr),
    isFestival: isFestival ? 1 : 0,
  }));

  let predictions;
  let source = 'ml-model';
  try {
    predictions = (await mlPredict(String(temple._id), rows)).predictions;
  } catch (err) {
    source = 'historical-average';
    predictions = await historicalAverage(temple, rows);
    // The service is up but has no model file (e.g. fresh clone): train one in the background.
    if (err.status === 404) retrainInBackground(temple);
  }

  const capacity = hourlyCapacity(temple, dateStr);
  const hourly = hours.map((hour, i) => {
    const predicted = Math.max(0, Math.round(predictions[i] || 0));
    const loadPct = capacity ? Math.round((predicted / capacity) * 100) : 0;
    return { hour, predicted, loadPct, level: crowdLevel(loadPct) };
  });

  const now = new Date();
  const isToday = localDateStr(now, temple.timezone) === dateStr;
  const currentHour = isToday ? localHour(now, temple.timezone) : -1;
  const upcoming = hourly.filter((h) => h.hour > currentHour);
  const recommendedHours = [...upcoming]
    .sort((a, b) => a.predicted - b.predicted)
    .slice(0, 3)
    .map((h) => h.hour)
    .sort((a, b) => a - b);
  const peak = hourly.reduce((best, h) => (h.predicted > (best?.predicted ?? -1) ? h : best), null);

  const value = {
    templeId: temple._id,
    date: dateStr,
    isFestival,
    festival: temple.festivalName(dateStr),
    source,
    hourlyCapacity: capacity,
    hours: hourly,
    recommendedHours,
    peakHour: peak?.hour ?? null,
    expectedTotal: hourly.reduce((sum, h) => sum + h.predicted, 0),
    generatedAt: now,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Sends the temple's footfall history to the Python service to (re)train its model. */
export async function trainTempleModel(temple) {
  const today = localDateStr(new Date(), temple.timezone);
  const logs = await FootfallLog.find({ templeId: temple._id, date: { $lt: today } }).lean();
  if (logs.length < MIN_TRAINING_ROWS) {
    throw new AppError(
      400,
      `Not enough history to train yet (${logs.length} hourly records, need ${MIN_TRAINING_ROWS})`,
      'NOT_ENOUGH_DATA',
    );
  }

  const records = logs.map((log) => ({
    hour: log.hour,
    dayOfWeek: log.dayOfWeek,
    month: monthOf(log.date),
    isFestival: log.isFestival ? 1 : 0,
    entries: log.entries,
  }));

  let result;
  try {
    result = await mlTrain(String(temple._id), records);
  } catch (err) {
    throw new AppError(503, `Prediction service unavailable: ${err.message}`, 'ML_UNAVAILABLE');
  }

  const mlModel = {
    trainedAt: new Date(),
    algorithm: result.algorithm,
    samples: result.samples,
    testSamples: result.testSamples,
    mae: result.mae,
    r2: result.r2,
    baselineMae: result.baselineMae,
    improvementPct: result.improvementPct,
    featureImportances: result.featureImportances,
  };
  await Temple.updateOne({ _id: temple._id }, { $set: { mlModel } });
  clearForecastCache(temple._id);
  return mlModel;
}
