import { signToken } from '../middleware/auth.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { normalizePhone } from '../utils/helpers.js';

export async function register(req, res) {
  const { name, email, phone, password } = req.valid.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');

  const user = new User({ name, email, phone: normalizePhone(phone) || undefined, role: 'devotee' });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ token: signToken(user), user });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError(401, 'Incorrect email or password', 'BAD_CREDENTIALS');
  }
  if (!user.isActive) throw new AppError(403, 'This account has been deactivated', 'ACCOUNT_DISABLED');

  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  const user = await User.findById(req.user._id).populate('templeId', 'name slug city timezone');
  res.json({ user });
}

export async function updateMe(req, res) {
  const { name, phone } = req.valid.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = normalizePhone(phone) || undefined;
  await req.user.save();
  res.json({ user: req.user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(currentPassword))) throw new AppError(400, 'Current password is incorrect');
  await user.setPassword(newPassword);
  await user.save();
  res.json({ ok: true });
}
