import env from '../config/env.js';
import { normalizePhone } from '../utils/helpers.js';

let client = null;

async function getClient() {
  if (!env.smsEnabled) return null;
  if (!client) {
    const { default: twilio } = await import('twilio');
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

/**
 * Sends an SMS through Twilio. Without Twilio credentials the message is only
 * logged, so the rest of the app works the same in development.
 * Never throws: SMS failures must not break bookings or scans.
 */
export async function sendSms(to, body) {
  const phone = normalizePhone(to);
  if (!phone) return { skipped: true };

  try {
    const twilio = await getClient();
    if (!twilio) {
      console.log(`[sms:mock] to ${phone}: ${body}`);
      return { mocked: true };
    }
    const message = await twilio.messages.create({ to: phone, from: env.twilio.fromNumber, body });
    return { sid: message.sid };
  } catch (err) {
    console.error(`[sms] failed to send to ${phone}: ${err.message}`);
    return { error: err.message };
  }
}

/** Verifies an inbound webhook really came from Twilio (only when a webhook URL is configured). */
export async function isValidTwilioRequest(req) {
  if (!env.twilio.authToken || !env.twilio.webhookUrl) return true;
  const { default: twilio } = await import('twilio');
  return twilio.validateRequest(env.twilio.authToken, req.get('X-Twilio-Signature') || '', env.twilio.webhookUrl, req.body || {});
}
