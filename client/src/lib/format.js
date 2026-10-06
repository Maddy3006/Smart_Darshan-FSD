const DEFAULT_TZ = 'Asia/Kolkata';

export function fmtTime(date, timeZone = DEFAULT_TZ) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone })
    .format(new Date(date))
    .toUpperCase();
}

export function fmtSlot(start, end, timeZone) {
  return `${fmtTime(start, timeZone)} – ${fmtTime(end, timeZone)}`;
}

export function fmtDate(date, timeZone = DEFAULT_TZ, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone }).format(new Date(date));
}

export function fmtDateTime(date, timeZone = DEFAULT_TZ) {
  return `${fmtDate(date, timeZone, { day: 'numeric', month: 'short' })}, ${fmtTime(date, timeZone)}`;
}

/** Formats a 'YYYY-MM-DD' calendar date without timezone shifts. */
export function fmtDateStr(dateStr, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(new Date(`${dateStr}T00:00:00Z`));
}

export function todayIn(timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function currentHourIn(timeZone = DEFAULT_TZ) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date())) % 24;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function hourLabel(hour) {
  const h = hour % 24;
  const display = h % 12 || 12;
  return `${display} ${h < 12 ? 'AM' : 'PM'}`;
}

export function hourRange(hour) {
  return `${hourLabel(hour)} – ${hourLabel(hour + 1)}`;
}

export function waitLabel(minutes) {
  if (!minutes || minutes <= 0) return 'No wait';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function rupees(amount) {
  return amount ? `₹${amount.toLocaleString('en-IN')}` : 'Free';
}

export function number(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function minutesUntil(date) {
  return Math.round((new Date(date).getTime() - Date.now()) / 60_000);
}

export function relativeTime(date) {
  const diff = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
