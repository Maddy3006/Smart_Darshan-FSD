import Temple from '../models/Temple.js';
import Token from '../models/Token.js';
import { getSnapshot, tokenQueueInfo } from '../services/liveStats.js';
import { isValidTwilioRequest } from '../services/smsService.js';
import { escapeRegex, extractTokenCode } from '../utils/helpers.js';
import { formatTime } from '../utils/tz.js';

const HELP_TEXT =
  'Smart Darshan SMS: send "STATUS <token code>" for your queue position, "WAIT <temple name>" for live waiting times, or "TEMPLES" for the temple list.';

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

function twiml(res, message) {
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`);
}

async function tokenStatusText(code) {
  const token = await Token.findOne({ code });
  if (!token) return `Token ${code} was not found. Please check the code.`;
  const temple = await Temple.findById(token.templeId);
  const tz = temple.timezone;
  const label = `Token ${code} (${token.darshanTypeName}, ${temple.name})`;
  const queue = await tokenQueueInfo(token, temple);

  switch (token.status) {
    case 'checked_in':
      return `${label}: in queue. ${queue.peopleAhead} people ahead, about ${queue.waitMin} min wait.`;
    case 'booked':
      return `${label}: slot ${formatTime(token.slotStartAt, tz)}-${formatTime(token.slotEndAt, tz)}. Entry opens ${formatTime(queue.entryOpensAt, tz)}. Current queue wait about ${queue.laneWaitMin} min.${queue.entryPaused ? ' Entry is paused right now.' : ''}`;
    case 'completed':
      return `${label}: darshan completed. Thank you for visiting.`;
    default:
      return `${label}: ${token.status}.`;
  }
}

async function templeWaitText(query) {
  const pattern = new RegExp(escapeRegex(query), 'i');
  const temple = await Temple.findOne({ isActive: true, $or: [{ slug: query.toLowerCase() }, { name: pattern }, { city: pattern }] });
  if (!temple) return `No temple matched "${query}". Send TEMPLES for the list.`;
  const live = await getSnapshot(temple._id);
  if (live.entryPaused) return `${temple.name}: entry is paused right now. ${live.pauseReason}`;
  const lanes = live.lanes.map((l) => `${l.name} ~${l.waitMin} min (${l.inQueue} in queue)`).join('; ');
  return `${temple.name} now: ${lanes}.`;
}

/**
 * Twilio inbound SMS webhook, so devotees with basic phones can check status.
 * Twilio posts form-encoded data; we answer with TwiML.
 */
export async function inboundSms(req, res) {
  if (!(await isValidTwilioRequest(req))) return res.status(403).send('Invalid signature');

  const body = String(req.body?.Body || '').trim();
  const [command = '', ...rest] = body.split(/\s+/);
  const argument = rest.join(' ');
  const code = extractTokenCode(body);

  if (code) return twiml(res, await tokenStatusText(code));

  switch (command.toUpperCase()) {
    case 'WAIT':
      return twiml(res, argument ? await templeWaitText(argument) : 'Send "WAIT <temple name>", e.g. WAIT Venkateswara');
    case 'TEMPLES': {
      const temples = await Temple.find({ isActive: true }, 'name city').sort({ name: 1 }).limit(10);
      return twiml(res, temples.map((t) => `${t.name} (${t.city})`).join('; ') || 'No temples are listed yet.');
    }
    default:
      return twiml(res, HELP_TEXT);
  }
}
