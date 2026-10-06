import crypto from 'node:crypto';
import mongoose from 'mongoose';
import env from '../config/env.js';

// No 0/O, 1/I/L to keep codes easy to read aloud and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const TOKEN_CODE_REGEX = /SD-[A-HJKMNP-Z2-9]{6}/;

export function generateTokenCode() {
  let code = 'SD-';
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Pulls a token code out of raw scanner input (a bare code or a status-page URL). */
export function extractTokenCode(input) {
  const match = String(input || '')
    .toUpperCase()
    .match(TOKEN_CODE_REGEX);
  return match ? match[0] : null;
}

/** Normalises a phone number to E.164. 10-digit numbers get the default country code. */
export function normalizePhone(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `${env.defaultCountryCode}${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

export function maskName(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => (part.length <= 2 ? part : `${part.slice(0, 2)}${'*'.repeat(Math.min(part.length - 2, 4))}`))
    .join(' ');
}

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isObjectId(value) {
  return mongoose.isValidObjectId(value) && String(value).length === 24;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const round1 = (n) => Math.round(n * 10) / 10;
