/**
 * Crowd simulator for demos. Acts like a busy gate: issues walk-in tokens and
 * scans devotees in and out through the real API, so dashboards, display boards
 * and wait times move live.
 *
 *   npm run simulate
 *   npm run simulate -- --temple=murugan --speed=2 --surge
 *
 * Options:
 *   --temple=venkateswara|murugan|mahalakshmi   which temple's staff account to use
 *   --email=... --password=...                  any staff/admin account instead
 *   --speed=1                                   actions per second (default 1)
 *   --surge                                     more arrivals than exits, so the queue grows
 *   --api=http://localhost:5000                 API base URL
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  }),
);

const API = `${args.api || process.env.API_URL || 'http://localhost:5000'}/api`;
const templeKey = args.temple || 'venkateswara';
const email = args.email || `staff.${templeKey}@smartdarshan.in`;
const password = args.password || 'Staff@123';
const speed = Number(args.speed || 1);
const surge = Boolean(args.surge);

const NAMES = [
  'Aarav',
  'Ananya',
  'Rohan',
  'Lakshmi',
  'Karthik',
  'Meera',
  'Vikram',
  'Divya',
  'Suresh',
  'Priya',
  'Arjun',
  'Kavya',
  'Rahul',
  'Sneha',
  'Ganesh',
  'Pooja',
];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let authToken = null;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}

function weightedLane(lanes) {
  const total = lanes.reduce((s, l) => s + l.capacityPerSlot / l.slotMinutes, 0);
  let r = Math.random() * total;
  for (const lane of lanes) {
    r -= lane.capacityPerSlot / lane.slotMinutes;
    if (r <= 0) return lane;
  }
  return lanes[0];
}

async function issueWalkin(lanes) {
  const lane = weightedLane(lanes);
  const groupSize = 1 + Math.floor(Math.random() * 4);
  const { token } = await api('/staff/walkin', {
    method: 'POST',
    body: { darshanTypeId: lane._id, groupSize, name: `${pick(NAMES)} (sim)` },
  });
  return `walk-in  ${token.code}  ${lane.name}  x${groupSize}`;
}

async function scanEntry() {
  const { tokens } = await api('/staff/tokens?enterable=true&sort=slot&limit=25');
  if (!tokens.length) return null;
  const token = pick(tokens);
  await api('/staff/scan', { method: 'POST', body: { code: token.code, action: 'entry' } });
  return `entry    ${token.code}  ${token.darshanType.name}  x${token.groupSize}`;
}

async function scanExit() {
  const { tokens } = await api('/staff/tokens?status=checked_in&sort=oldest&limit=10');
  const ready = tokens.filter((t) => Date.now() - new Date(t.checkedInAt).getTime() > 60_000);
  if (!ready.length) return null;
  const token = ready[0];
  await api('/staff/scan', { method: 'POST', body: { code: token.code, action: 'exit' } });
  return `exit     ${token.code}  ${token.darshanType.name}  x${token.groupSize}`;
}

async function main() {
  const login = await api('/auth/login', { method: 'POST', body: { email, password } });
  authToken = login.token;
  const { temple, live } = await api('/staff/context');
  const lanes = temple.darshanTypes;

  console.log(`Simulating crowd at ${temple.name} as ${login.user.name}`);
  console.log(`Currently ${live.totals.inQueue} in queue. Speed ${speed}/s${surge ? ', SURGE mode' : ''}. Ctrl+C to stop.\n`);

  const weights = surge ? { walkin: 0.4, entry: 0.45, exit: 0.15 } : { walkin: 0.3, entry: 0.35, exit: 0.35 };

  setInterval(async () => {
    const r = Math.random();
    const action = r < weights.walkin ? issueWalkin : r < weights.walkin + weights.entry ? scanEntry : scanExit;
    try {
      const line = (await action(lanes)) ?? (await scanEntry()) ?? (await issueWalkin(lanes));
      if (line) console.log(`${new Date().toLocaleTimeString()}  ${line}`);
    } catch (err) {
      console.log(`${new Date().toLocaleTimeString()}  skipped: ${err.message}`);
    }
  }, 1000 / speed);

  setInterval(async () => {
    try {
      const { live: now } = await api('/staff/context');
      const lanesText = now.lanes.map((l) => `${l.name}: ${l.inQueue} in queue, ~${l.waitMin} min`).join(' | ');
      console.log(`\n--- ${lanesText} ---\n`);
    } catch {
      /* ignore */
    }
  }, 15_000);
}

main().catch((err) => {
  console.error(`Simulator failed: ${err.message}`);
  console.error('Is the API running (npm run dev) and is the temple open right now? Try "npm run seed -- --reset --24h".');
  process.exit(1);
});
