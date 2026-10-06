import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const DEV_SECRET = 'dev-only-secret-change-me';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_darshan',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of allowed frontend origins.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  autoSeed: process.env.AUTO_SEED !== 'false',
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '+91',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    // Public URL Twilio calls for inbound SMS. When set, request signatures are verified.
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
  },
};

env.isProduction = env.nodeEnv === 'production';
env.publicClientUrl = env.clientUrls[0];
env.smsEnabled = Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.fromNumber);

if (env.isProduction && env.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export default env;
