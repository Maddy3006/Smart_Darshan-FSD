import mongoose from 'mongoose';
import env from './env.js';

const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 40;

/**
 * Connects to MongoDB, retrying for a while so the API can start before the
 * database is ready (e.g. when `npm run dev` launches both together).
 */
export async function connectDB(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`[db] connected to ${redact(uri)}`);
      return mongoose.connection;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      console.log(`[db] waiting for MongoDB (${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return mongoose.connection;
}

export function disconnectDB() {
  return mongoose.disconnect();
}

function redact(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}
