export const Collections = {
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  POSTS: 'posts',
  LIKES: 'likes',
  COMMENTS: 'comments',
  SAVES: 'saves',
  SHARES: 'shares',
  STORIES: 'stories',
  FOLLOWERS: 'followers',
  MESSAGES: 'messages',
  CHANNELS: 'channels',
  REELS: 'reels',
  PROFILES: 'profiles',
  REACTIONS: 'reactions',
  GROUPS: 'groups',
  GROUP_MESSAGES: 'group_messages',
  GROUP_REACTIONS: 'group_reactions',
  REPLIES: 'replies',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  PURCHASES: 'purchases',
  GROUP_REPLIES: 'group_replies',
  CARDS: 'cards',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  ASSETS: 'assets',
  CREATOR_ASSETS: 'creator_assets',
  FAN_ASSETS: 'fan_assets',
} as const;

export const Env = {
  PORT: process.env.PORT || '',
  DOMAIN: process.env.DOMAIN || '',

  MONGODB_URL: process.env.MONGODB_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || '',
  AWS_BUCKET_URL: process.env.AWS_BUCKET_URL || '',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || '',

  SOCKET_ADMIN_USERNAME: process.env.SOCKET_ADMIN_USERNAME || '',
  SOCKET_ADMIN_PASSWORD: process.env.SOCKET_ADMIN_PASSWORD || '',

  SENTRY_DSN: process.env.SENTRY_DSN || '', // TURN OFF THE SENTRY WHILE USING DEV MODE
  NODE_ENV: process.env.NODE_ENV || '',
  SERVICE_NAME: process.env.SERVICE_NAME || '',
  GIT_SHA: process.env.GIT_SHA || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET_KEY: process.env.STRIPE_WEBHOOK_SECRET_KEY || '',
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
  EMAIL: process.env.EMAIL || '',
  APP_PASSWORD: process.env.APP_PASSWORD || '',
  EMAIL_HOST:process.env.EMAIL_HOST || '',
  EMAIL_PORT:process.env.EMAIL_PORT || ''
};
type EnvKeys = keyof typeof Env;
export const ENV = (key: EnvKeys) => Env[key];
