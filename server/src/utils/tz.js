/**
 * Timezone helpers built on Intl, so slot times are correct no matter which
 * timezone the server itself runs in. Dates are passed around as 'YYYY-MM-DD'
 * strings in the temple's local calendar.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatters = new Map();

function partsFormatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
      }),
    );
  }
  return formatters.get(timeZone);
}

export function zonedParts(date, timeZone) {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function offsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** Converts a local date + 'HH:mm' in a timezone to a UTC Date. Accepts '24:00'. */
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const firstOffset = offsetMs(new Date(guess), timeZone);
  let result = guess - firstOffset;
  const secondOffset = offsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

const pad = (n) => String(n).padStart(2, '0');

export function localDateStr(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function localHour(date, timeZone) {
  return zonedParts(date, timeZone).hour;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function dayOfWeek(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function monthOf(dateStr) {
  return Number(dateStr.slice(5, 7));
}

export function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

export function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'short' }).format(date);
}

/** Parses 'HH:mm' into fractional hours, e.g. '21:30' -> 21.5. */
export function timeToHours(timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh + mm / 60;
}
