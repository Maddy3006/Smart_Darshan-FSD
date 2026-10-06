import crypto from 'node:crypto';
import env from '../config/env.js';
import { emitTo } from '../sockets/index.js';
import { sendSms } from './smsService.js';

/** In-app notification pushed to a logged-in user's open tabs. */
export function notifyUser(userId, { title, message, link, level = 'info' }) {
  if (!userId) return;
  emitTo(`user:${userId}`, 'notification', {
    id: crypto.randomUUID(),
    title,
    message,
    link,
    level,
    createdAt: new Date(),
  });
}

export function tokenLink(code) {
  return `${env.publicClientUrl}/t/${code}`;
}

/** Tells everyone watching a token (owner, public status page) that it changed. */
export function emitTokenChanged(token) {
  emitTo(`token:${token.code}`, 'token:update', {
    code: token.code,
    status: token.status,
    updatedAt: new Date(),
  });
}

/**
 * Notifies a token holder in-app and, optionally, by SMS (for devotees without the app).
 * SMS is sent in the background so API responses stay fast.
 */
export function notifyTokenHolder(token, { title, message, sms = false, level }) {
  notifyUser(token.userId, { title, message, link: `/t/${token.code}`, level });
  if (sms && token.phone) {
    void sendSms(token.phone, `Smart Darshan: ${message}`);
  }
}
