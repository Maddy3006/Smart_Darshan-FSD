/**
 * Loads demo data.
 *   npm run seed                 seed an empty database
 *   npm run seed -- --reset      wipe everything and re-seed
 *   npm run seed -- --reset --24h  temples open all day (handy for late-night testing)
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { trainModels } from '../jobs/index.js';
import Temple from '../models/Temple.js';
import { seedDatabase } from './seedData.js';

const args = new Set(process.argv.slice(2));
const reset = args.has('--reset');
const allDay = args.has('--24h');

await connectDB();

if (!reset && (await Temple.exists({}))) {
  console.log('[seed] database already has data. Run "npm run seed -- --reset" to wipe and re-seed.');
} else {
  await seedDatabase({ reset, allDay });
  await trainModels();
  console.log(`[seed] done${allDay ? ' (temples open 24 hours)' : ''}. Refresh any open browser tabs.`);
}

await disconnectDB();
process.exit(0);
