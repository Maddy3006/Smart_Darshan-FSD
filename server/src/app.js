import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (!env.isProduction) app.use(morgan('dev', { skip: (req) => req.path === '/api/health' }));

  app.use('/api', apiRoutes);

  const indexHtml = path.join(clientDist, 'index.html');
  if (env.serveClient && fs.existsSync(indexHtml)) {
    // Built files have hashed names, so they can be cached for a long time.
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(clientDist, { index: false }));
    // Any other GET outside /api is a page of the React app (client-side routing).
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(indexHtml);
    });
  } else {
    if (env.serveClient) console.log('[api] SERVE_CLIENT is on but client/dist is missing; run `npm run build` first');
    app.get('/', (_req, res) => res.json({ name: 'Smart Darshan API', docs: '/api/health' }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
