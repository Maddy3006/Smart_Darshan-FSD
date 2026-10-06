import FootfallLog from '../models/FootfallLog.js';
import Slot from '../models/Slot.js';
import Token from '../models/Token.js';
import { addDays, localDateStr } from '../utils/tz.js';
import { getForecast } from './forecastService.js';

/** Today at a glance: actual vs predicted footfall by hour, token and slot totals. */
export async function todayStats(temple) {
  const today = localDateStr(new Date(), temple.timezone);

  const [logs, forecast, tokenGroups, slotGroups] = await Promise.all([
    FootfallLog.find({ templeId: temple._id, date: today }).lean(),
    getForecast(temple, today),
    Token.aggregate([
      { $match: { templeId: temple._id, slotDate: today } },
      {
        $group: {
          _id: { status: '$status', source: '$source' },
          tokens: { $sum: 1 },
          people: { $sum: '$groupSize' },
        },
      },
    ]),
    Slot.aggregate([
      { $match: { templeId: temple._id, date: today } },
      {
        $group: {
          _id: '$darshanTypeId',
          slots: { $sum: 1 },
          onlineCapacity: { $sum: '$onlineCapacity' },
          walkinCapacity: { $sum: '$walkinCapacity' },
          onlineBooked: { $sum: '$onlineBooked' },
          walkinBooked: { $sum: '$walkinBooked' },
        },
      },
    ]),
  ]);

  const hourly = forecast.hours.map((h) => {
    const log = logs.find((l) => l.hour === h.hour);
    return { hour: h.hour, predicted: h.predicted, entries: log?.entries ?? 0, exits: log?.exits ?? 0 };
  });

  const tokens = { total: 0, people: 0, byStatus: {}, bySource: { online: 0, walkin: 0 } };
  for (const g of tokenGroups) {
    tokens.total += g.tokens;
    tokens.people += g.people;
    tokens.byStatus[g._id.status] = (tokens.byStatus[g._id.status] || 0) + g.tokens;
    tokens.bySource[g._id.source] += g.people;
  }

  const lanes = temple.darshanTypes
    .filter((dt) => dt.active)
    .map((dt) => {
      const s = slotGroups.find((g) => String(g._id) === String(dt._id)) || {};
      const capacity = (s.onlineCapacity || 0) + (s.walkinCapacity || 0);
      const booked = (s.onlineBooked || 0) + (s.walkinBooked || 0);
      return {
        darshanTypeId: dt._id,
        name: dt.name,
        slots: s.slots || 0,
        capacity,
        onlineBooked: s.onlineBooked || 0,
        walkinBooked: s.walkinBooked || 0,
        utilizationPct: capacity ? Math.round((booked / capacity) * 100) : 0,
      };
    });

  return { date: today, festival: forecast.festival, forecastSource: forecast.source, hourly, tokens, lanes };
}

/** Crowd trend analysis over the last N days: daily totals and a weekday x hour heatmap. */
export async function trendStats(temple, days = 30) {
  const today = localDateStr(new Date(), temple.timezone);
  const from = addDays(today, -days);

  const logs = await FootfallLog.find({ templeId: temple._id, date: { $gte: from, $lt: today } }).lean();

  const dailyMap = new Map();
  const cells = new Map();
  for (const log of logs) {
    const day = dailyMap.get(log.date) || { date: log.date, entries: 0, isFestival: log.isFestival, dayOfWeek: log.dayOfWeek };
    day.entries += log.entries;
    dailyMap.set(log.date, day);

    const cellKey = `${log.dayOfWeek}|${log.hour}`;
    const cell = cells.get(cellKey) || { dayOfWeek: log.dayOfWeek, hour: log.hour, total: 0, count: 0 };
    cell.total += log.entries;
    cell.count += 1;
    cells.set(cellKey, cell);
  }

  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const heatmap = [...cells.values()].map((c) => ({ dayOfWeek: c.dayOfWeek, hour: c.hour, avg: Math.round(c.total / c.count) }));

  const totals = daily.map((d) => d.entries);
  const avgDaily = totals.length ? Math.round(totals.reduce((s, v) => s + v, 0) / totals.length) : 0;
  const weekdayDays = daily.filter((d) => d.dayOfWeek > 0 && d.dayOfWeek < 6);
  const weekendDays = daily.filter((d) => d.dayOfWeek === 0 || d.dayOfWeek === 6);
  const avg = (list) => (list.length ? Math.round(list.reduce((s, d) => s + d.entries, 0) / list.length) : 0);
  const busiestCell = heatmap.reduce((best, c) => (c.avg > (best?.avg ?? -1) ? c : best), null);
  const quietestCell = heatmap.reduce((best, c) => (c.avg < (best?.avg ?? Infinity) ? c : best), null);
  const busiestDay = daily.reduce((best, d) => (d.entries > (best?.entries ?? -1) ? d : best), null);

  return {
    from,
    to: addDays(today, -1),
    days,
    daily,
    heatmap,
    summary: {
      totalVisitors: totals.reduce((s, v) => s + v, 0),
      avgDaily,
      weekdayAvg: avg(weekdayDays),
      weekendAvg: avg(weekendDays),
      festivalAvg: avg(daily.filter((d) => d.isFestival)),
      busiestDay,
      busiestSlot: busiestCell,
      quietestSlot: quietestCell,
    },
  };
}
