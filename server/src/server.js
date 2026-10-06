import http from 'node:http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import env from './config/env.js';
import { startJobs } from './jobs/index.js';
import Temple from './models/Temple.js';
import { seedDatabase } from './scripts/seedData.js';
import { getSnapshot } from './services/liveStats.js';
import { initSocket } from './sockets/index.js';

async function main() {
  await connectDB();

  if (env.autoSeed && !(await Temple.exists({}))) {
    console.log('[seed] empty database detected, loading demo data...');
    await seedDatabase();
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server, { getSnapshot });

  server.listen(env.port, () => {
    console.log(`[api] Smart Darshan API running on http://localhost:${env.port}`);
    console.log(`[api] SMS mode: ${env.smsEnabled ? 'Twilio' : 'mock (messages are logged here)'}`);
  });

  startJobs();

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
