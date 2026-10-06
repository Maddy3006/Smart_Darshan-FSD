import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Returns the active user for a JWT, or null if the token is invalid/expired.
 * Database errors are not swallowed: a temporary outage must not look like a bad
 * session, or clients would log users out.
 */
export async function userFromJwt(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  return user?.isActive ? user : null;
}

function bearerToken(req) {
  const header = req.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function authenticate(req, _res, next) {
  const token = bearerToken(req);
  if (!token) throw new AppError(401, 'Please log in to continue', 'AUTH_REQUIRED');
  const user = await userFromJwt(token);
  if (!user) throw new AppError(401, 'Your session has expired. Please log in again', 'AUTH_INVALID');
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is sent, but never rejects the request. */
export async function optionalAuth(req, _res, next) {
  const token = bearerToken(req);
  if (token) req.user = await userFromJwt(token);
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to do this', 'FORBIDDEN');
    }
    next();
  };
}
