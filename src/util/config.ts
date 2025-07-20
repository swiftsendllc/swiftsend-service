const getEnv = (key: string) => {
  let value = process.env[key]!;

  if (!value && typeof window !== 'undefined') value = window.process.env[key]!;

  if (!value) console.error(`Environment ${key} is not set`);

  return value;
};

export const configService = {
  get PORT() {
    return getEnv('PORT');
  },
  get DOMAIN() {
    return getEnv('DOMAIN');
  },
  get MONGODB_URL() {
    return getEnv('MONGODB_URL');
  },
  get JWT_SECRET() {
    return getEnv('JWT_SECRET');
  },
  get AWS_ACCESS_KEY_ID() {
    return getEnv('AWS_ACCESS_KEY_ID');
  },
  get AWS_SECRET_ACCESS_KEY() {
    return getEnv('AWS_SECRET_ACCESS_KEY');
  },
  get AWS_S3_ENDPOINT() {
    return getEnv('AWS_S3_ENDPOINT');
  },
  get AWS_BUCKET_URL() {
    return getEnv('AWS_BUCKET_URL');
  },
  get AWS_BUCKET_NAME() {
    return getEnv('AWS_BUCKET_NAME');
  },
  get SOCKET_ADMIN_USERNAME() {
    return getEnv('SOCKET_ADMIN_USERNAME');
  },
  get SOCKET_ADMIN_PASSWORD() {
    return getEnv('SOCKET_ADMIN_PASSWORD');
  },
  get SENTRY_DSN() {
    return getEnv('SENTRY_DSN');
  },
  get NODE_ENV() {
    return getEnv('NODE_ENV');
  },
  get SERVICE_NAME() {
    return getEnv('SERVICE_NAME');
  },
  get GIT_SHA() {
    return getEnv('GIT_SHA');
  },
  get STRIPE_SECRET_KEY() {
    return getEnv('STRIPE_SECRET_KEY');
  },
  get STRIPE_WEBHOOK_SECRET_KEY() {
    return getEnv('STRIPE_WEBHOOK_SECRET_KEY');
  },
  get STRIPE_PRICE_ID() {
    return getEnv('STRIPE_PRICE_ID');
  },
  get STRIPE_PRODUCT_ID() {
    return getEnv('STRIPE_PRODUCT_ID');
  },
  get EMAIL() {
    return getEnv('EMAIL');
  },
  get APP_PASSWORD() {
    return getEnv('APP_PASSWORD');
  },
  get STRIPE_PUBLISHABLE_KEY() {
    return getEnv('STRIPE_PUBLISHABLE_KEY');
  },
  get EMAIL_HOST() {
    return getEnv('EMAIL_HOST');
  },
  get EMAIL_PORT() {
    return getEnv('EMAIL_PORT');
  },
};
export type RunTimeEnvKeys = keyof typeof configService;
