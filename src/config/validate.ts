import { RunTimeEnvKeys } from '../util/config';

export const validator: Record<RunTimeEnvKeys, { type: 'string' | 'url' | 'number' }> = {
  PORT: {
    type: 'number',
  },
  DOMAIN: {
    type: 'url',
  },
  MONGODB_URL: {
    type: 'url',
  },
  JWT_SECRET: {
    type: 'string',
  },
  AWS_ACCESS_KEY_ID: {
    type: 'string',
  },
  AWS_SECRET_ACCESS_KEY: {
    type: 'string',
  },
  AWS_S3_ENDPOINT: {
    type: 'url',
  },
  AWS_BUCKET_URL: {
    type: 'url',
  },
  AWS_BUCKET_NAME: {
    type: 'string',
  },
  SOCKET_ADMIN_PASSWORD: {
    type: 'string',
  },
  SOCKET_ADMIN_USERNAME: {
    type: 'string',
  },
  SENTRY_DSN: {
    type: 'string',
  },
  NODE_ENV: {
    type: 'string',
  },
  SERVICE_NAME: {
    type: 'string',
  },
  GIT_SHA: {
    type: 'string',
  },
  STRIPE_WEBHOOK_SECRET_KEY: {
    type: 'string',
  },
  STRIPE_PRICE_ID: {
    type: 'string',
  },
  STRIPE_PUBLISHABLE_KEY: {
    type: 'string',
  },
  STRIPE_SECRET_KEY: {
    type: 'string',
  },
  STRIPE_PRODUCT_ID: {
    type: 'string',
  },
  EMAIL: {
    type: 'string',
  },
  APP_PASSWORD: {
    type: 'string',
  },
  EMAIL_HOST: {
    type: 'string',
  },
  EMAIL_PORT: {
    type: 'number',
  },
};
(() => {
  const missing: string[] = [];
  for (const key of Object.keys(validator)) {
    const value = process.env[key];
    const type = validator[key as RunTimeEnvKeys].type;
    if (value && type === 'url') {
      try {
        new URL(value);
      } catch {
        missing.push(`${key}=?`);
      }
    }
    if (type === 'number' && isNaN(Number(value))) missing.push(`${key}=?`);
    if (!value) missing.push(key);
  }
  if (missing.length) throw new Error(`Environment validation failed: ${missing.join(', ')}`);
})();
