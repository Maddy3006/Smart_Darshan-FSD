import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const DEV_SECRET = 'dev-only-secret-change-me';
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_darshan',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of allowed frontend origins. On Render the service's own URL is the default.
  clientUrls: (process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  mlServiceUrl: (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
  // Shared secret sent to the prediction service (must match ML_API_KEY there).
  mlApiKey: process.env.ML_API_KEY || '',
  // Load demo data into an empty database: on by default in development, off in production.
  autoSeed: process.env.AUTO_SEED ? process.env.AUTO_SEED === 'true' : !isProduction,
  // Password for every seeded demo account. Required when seeding in production.
  demoPassword: process.env.DEMO_PASSWORD || '',
  // Serve the built React app (client/dist) from the API, so one service hosts the whole site.
  serveClient: process.env.SERVE_CLIENT ? process.env.SERVE_CLIENT === 'true' : isProduction,
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '+91',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    // Public URL Twilio calls for inbound SMS. When set, request signatures are verified.
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
  },
};

env.isProduction = isProduction;
env.publicClientUrl = env.clientUrls[0];
env.smsEnabled = Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.fromNumber);

if (isProduction) {
  if (env.jwtSecret === DEV_SECRET) throw new Error('JWT_SECRET must be set in production');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set in production (e.g. your MongoDB Atlas connection string)');
  if (env.autoSeed && env.demoPassword.length < 8) {
    throw new Error('AUTO_SEED=true in production needs DEMO_PASSWORD (8+ characters) so demo accounts do not use the public passwords');
  }
}

export default env;
