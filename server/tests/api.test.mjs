/**
 * End-to-end API checks for the Smart Darshan backend.
 * Start the stack first (npm run dev), then:  npm run test:api
 *
 * Covers: public temple/slot/forecast endpoints, registration and login, online
 * booking limits, walk-in tokens, entry/exit gate scans and their rejections,
 * queue position, cancellation and seat release, admin stats/controls/alerts,
 * temple scoping for staff/admin/superadmin, and the inbound SMS webhook.
 */
const API = process.env.API_URL || 'http://localhost:5000/api';
let failures = 0;

async function call(path, { method = 'GET', body, token, headers = {}, form } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: form ? new URLSearchParams(form) : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  -> ${extra}` : ''}`);
  if (!cond) failures += 1;
}

const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } })).data.token;

// Public
const temples = await call('/temples');
check('list temples', temples.status === 200 && temples.data.temples.length === 3, JSON.stringify(temples.data.temples[0].live));
const t0 = temples.data.temples.find((t) => t.slug === 'sri-venkateswara-swamy-temple');
const detail = await call(`/temples/${t0.slug}`);
check('temple by slug', detail.status === 200 && detail.data.temple.darshanTypes.length === 3);
const slots = await call(`/temples/${t0._id}/slots?darshanTypeId=${t0.darshanTypes[0]._id}`);
check('slots today', slots.status === 200 && slots.data.slots.length > 0, `${slots.data.slots.length} slots, first available ${JSON.stringify(slots.data.slots.find(s => !s.isPast)?.available)}`);
const live = await call(`/temples/${t0._id}/live`);
check('live snapshot', live.status === 200, JSON.stringify(live.data.live.lanes.map(l => [l.name, l.inQueue, l.waitMin, l.throughputSource])));
const forecast = await call(`/temples/${t0._id}/forecast`);
check('forecast', forecast.status === 200 && forecast.data.forecast.source === 'ml-model', `source=${forecast.data.forecast.source} recommended=${forecast.data.forecast.recommendedHours} peak=${forecast.data.forecast.peakHour}`);
const badDate = await call(`/temples/${t0._id}/slots?date=2020-01-01`);
check('slot date out of range rejected', badDate.status === 400, badDate.data.error?.message);

// Register + book
const email = `test${Date.now()}@example.com`;
const reg = await call('/auth/register', { method: 'POST', body: { name: 'Test Devotee', email, password: 'secret123', phone: '9123456789' } });
check('register', reg.status === 201 && reg.data.token, reg.data.user?.phone);
const dupe = await call('/auth/register', { method: 'POST', body: { name: 'Test Devotee', email, password: 'secret123' } });
check('duplicate email rejected', dupe.status === 409);
const badLogin = await call('/auth/login', { method: 'POST', body: { email, password: 'wrong' } });
check('wrong password rejected', badLogin.status === 401);
const devToken = reg.data.token;

const upcoming = slots.data.slots.find((s) => !s.isPast && new Date(s.endAt) - Date.now() > 15 * 60000 && s.available.online >= 2);
const book = await call('/tokens', { method: 'POST', token: devToken, body: { slotId: upcoming._id, groupSize: 2, name: 'Test Devotee', phone: '9123456789' } });
check('book online', book.status === 201, book.data.token?.code || JSON.stringify(book.data));
const code = book.data.token.code;
const tooBig = await call('/tokens', { method: 'POST', token: devToken, body: { slotId: upcoming._id, groupSize: 15, name: 'Test Devotee' } });
check('group size limit', tooBig.status === 400, tooBig.data.error?.message);
const mine = await call('/tokens/mine?scope=upcoming', { token: devToken });
check('my tokens', mine.status === 200 && mine.data.tokens.length === 1);
const pub = await call(`/tokens/${code}`);
check('public status masks name', pub.status === 200 && pub.data.token.name !== 'Test Devotee' && !pub.data.token.phone, `${pub.data.token.name} ${JSON.stringify(pub.data.queue)}`);
const owner = await call(`/tokens/${code}`, { token: devToken });
check('owner sees full name', owner.data.token.name === 'Test Devotee' && owner.data.isOwner);

// Staff
const staffToken = await login('staff.venkateswara@smartdarshan.in', 'Staff@123');
check('staff login', Boolean(staffToken));
const ctx = await call('/staff/context', { token: staffToken });
check('staff context', ctx.status === 200 && ctx.data.temple._id === t0._id);
const forbidden = await call('/admin/temple', { token: staffToken });
check('staff blocked from admin', forbidden.status === 403);
const wslots = await call('/staff/walkin/slots', { token: staffToken });
check('walk-in slots', wslots.status === 200, `${wslots.data.slots.length} slots`);
const walkin = await call('/staff/walkin', { method: 'POST', token: staffToken, body: { darshanTypeId: t0.darshanTypes[2]._id, groupSize: 1, name: 'Walkin Person', phone: '9000011111' } });
check('issue walk-in', walkin.status === 201, `${walkin.data.token?.code} slot ${walkin.data.token?.slot.startAt}`);

const entryEarly = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code, action: 'entry' } });
const slotStartsIn = (new Date(upcoming.startAt) - Date.now()) / 60000;
check('online token entry (early or ok)', slotStartsIn > 15 ? entryEarly.status === 409 && entryEarly.data.error.code === 'TOO_EARLY' : entryEarly.status === 200, `${entryEarly.status} ${entryEarly.data.error?.message || entryEarly.data.message}`);
const exitBefore = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code: walkin.data.token.code, action: 'exit' } });
check('exit before entry rejected', exitBefore.status === 409 && exitBefore.data.error.code === 'NOT_ENTERED');
const entry = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code: `http://localhost:5173/t/${walkin.data.token.code}`, action: 'entry' } });
check('walk-in entry via URL QR', entry.status === 200, entry.data.message || entry.data.error?.message);
const again = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code: walkin.data.token.code, action: 'entry' } });
check('double entry rejected', again.status === 409 && again.data.error.code === 'ALREADY_ENTERED', again.data.error?.message);
const wStatus = await call(`/tokens/${walkin.data.token.code}`);
check('in-queue position', wStatus.data.queue.state === 'in_queue', JSON.stringify(wStatus.data.queue));
const exit = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code: walkin.data.token.code, action: 'exit' } });
check('exit', exit.status === 200 && exit.data.token.status === 'completed');
const list = await call('/staff/tokens?status=checked_in&sort=oldest&limit=5', { token: staffToken });
check('staff token list', list.status === 200, `${list.data.tokens.length} checked in`);
const enterable = await call('/staff/tokens?enterable=true&limit=5', { token: staffToken });
check('enterable list', enterable.status === 200, `${enterable.data.tokens.length} enterable`);

// Cancel
const tomorrow = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
const tSlots = await call(`/temples/${t0._id}/slots?date=${tomorrow}&darshanTypeId=${t0.darshanTypes[1]._id}`);
const later = await call('/tokens', { method: 'POST', token: devToken, body: { slotId: tSlots.data.slots[3]._id, groupSize: 1, name: 'Test Devotee' } });
check('book tomorrow', later.status === 201, later.data.error?.message);
const cancel = await call(`/tokens/${later.data.token.code}/cancel`, { method: 'POST', token: devToken });
const afterCancel = await call(`/temples/${t0._id}/slots?date=${tomorrow}&darshanTypeId=${t0.darshanTypes[1]._id}`);
check('seat released after cancel', afterCancel.data.slots[3].onlineBooked === tSlots.data.slots[3].onlineBooked, `${tSlots.data.slots[3].onlineBooked} -> ${afterCancel.data.slots[3].onlineBooked}`);
check('cancel booking', cancel.status === 200 && cancel.data.token.status === 'cancelled', cancel.data.error?.message);

// Admin
const adminToken = await login('admin.venkateswara@smartdarshan.in', 'Admin@123');
const today = await call('/admin/stats/today', { token: adminToken });
check('admin stats today', today.status === 200, JSON.stringify(today.data.stats?.tokens));
const trends = await call('/admin/stats/trends?days=30', { token: adminToken });
check('admin trends', trends.status === 200 && trends.data.trends.daily.length === 30, JSON.stringify(trends.data.trends?.summary));
const week = await call('/admin/forecast/week', { token: adminToken });
check('week forecast', week.status === 200 && week.data.days.length === 7, week.data.days.map(d => `${d.date}:${d.expectedTotal}${d.festival ? '*' : ''}`).join(' '));
const model = await call('/admin/forecast/model', { token: adminToken });
check('model status', model.status === 200 && model.data.model?.r2, JSON.stringify(model.data.model));
const pause = await call('/admin/controls', { method: 'PATCH', token: adminToken, body: { entryPaused: true, pauseReason: 'Test pause' } });
check('pause entry', pause.status === 200 && pause.data.controls.entryPaused);
const walkin2 = await call('/staff/walkin', { method: 'POST', token: staffToken, body: { darshanTypeId: t0.darshanTypes[1]._id, groupSize: 1, name: 'Paused Person' } });
const pausedScan = await call('/staff/scan', { method: 'POST', token: staffToken, body: { code: walkin2.data.token.code, action: 'entry' } });
check('scan rejected while paused', pausedScan.status === 409 && pausedScan.data.error.code === 'ENTRY_PAUSED', pausedScan.data.error?.message);
const resume = await call('/admin/controls', { method: 'PATCH', token: adminToken, body: { entryPaused: false } });
check('resume entry', resume.status === 200 && !resume.data.controls.entryPaused);
const ann = await call('/admin/announcements', { method: 'POST', token: adminToken, body: { message: 'Test announcement', type: 'warning' } });
check('create announcement', ann.status === 201);
const adminSlots = await call('/admin/slots', { token: adminToken });
check('admin slots', adminSlots.status === 200, `${adminSlots.data.slots.length} slots`);
const staffList = await call('/admin/staff', { token: adminToken });
check('staff list', staffList.status === 200 && staffList.data.staff.length >= 2);
const sync = await call('/admin/slots/sync', { method: 'POST', token: adminToken, body: {} });
check('slot sync idempotent', sync.status === 200 && sync.data.result.created === 0, JSON.stringify(sync.data.result));
const updateTemple = await call('/admin/temple', { method: 'PATCH', token: adminToken, body: { settings: { maxGroupSize: 5 } } });
check('update settings', updateTemple.status === 200 && updateTemple.data.temple.settings.maxGroupSize === 5, updateTemple.data.error?.message);
await call('/admin/temple', { method: 'PATCH', token: adminToken, body: { settings: { maxGroupSize: 6 } } });
const otherTemple = await call('/admin/temple', { token: adminToken, headers: { 'X-Temple-Id': temples.data.temples.find((t) => t._id !== t0._id)._id } });
check('admin cannot switch temple via header', otherTemple.data.temple._id === t0._id);
const alerts = await call('/admin/alerts', { token: adminToken });
check('alerts', alerts.status === 200);

// Superadmin
const superToken = await login('superadmin@smartdarshan.in', 'Super@123');
const sTemples = await call('/superadmin/temples', { token: superToken });
check('superadmin temples', sTemples.status === 200 && sTemples.data.temples.length === 3);
const noScope = await call('/admin/temple', { token: superToken });
check('superadmin needs temple header', noScope.status === 400);
const scoped = await call('/admin/temple', { token: superToken, headers: { 'X-Temple-Id': temples.data.temples.find((t) => t.slug === 'sri-mahalakshmi-temple')._id } });
check('superadmin scoped admin', scoped.status === 200 && scoped.data.temple._id === temples.data.temples.find((t) => t.slug === 'sri-mahalakshmi-temple')._id);

// SMS
const sms = await call('/sms/inbound', { method: 'POST', form: { Body: `status ${walkin.data.token.code}`, From: '+919000011111' } });
check('sms status', sms.status === 200 && String(sms.data).includes('<Message>'), String(sms.data).slice(0, 200));
const smsWait = await call('/sms/inbound', { method: 'POST', form: { Body: 'WAIT murugan' } });
check('sms wait', String(smsWait.data).includes('Murugan'), String(smsWait.data).slice(0, 200));

console.log(`\n${failures ? `${failures} FAILED` : 'ALL PASSED'}`);
