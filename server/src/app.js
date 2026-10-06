import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (!env.isProduction) app.use(morgan('dev', { skip: (req) => req.path === '/api/health' }));

  app.get('/', (_req, res) => res.json({ name: 'Smart Darshan API', docs: '/api/health' }));
  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
