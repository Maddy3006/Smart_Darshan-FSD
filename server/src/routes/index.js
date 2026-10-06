import express, { Router } from 'express';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { inboundSms } from '../controllers/smsController.js';
import { mlHealth } from '../services/mlClient.js';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import staffRoutes from './staffRoutes.js';
import superadminRoutes from './superadminRoutes.js';
import templeRoutes from './templeRoutes.js';
import tokenRoutes from './tokenRoutes.js';

const router = Router();

router.get('/health', async (_req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ml: await mlHealth(),
    sms: env.smsEnabled ? 'twilio' : 'mock',
    time: new Date(),
  });
});

router.use('/auth', authRoutes);
router.use('/temples', templeRoutes);
router.use('/tokens', tokenRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/superadmin', superadminRoutes);
router.post('/sms/inbound', express.urlencoded({ extended: false }), inboundSms);

export default router;
