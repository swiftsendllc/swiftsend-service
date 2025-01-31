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
} as const;

export const Env = {
  PORT: process.env.PORT || '',

  MONGODB_URL: process.env.MONGODB_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT || '',
  AWS_BUCKET_URL: process.env.AWS_BUCKET_URL || '',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || '',

  SOCKET_ADMIN_USERNAME: process.env.SOCKET_ADMIN_USERNAME || '',
  SOCKET_ADMIN_PASSWORD: process.env.SOCKET_ADMIN_PASSWORD || '',

  SENTRY_DSN: process.env.SEN_TRY_DSN || '', // TURN OFF THE SENTRY WHILE USING DEV MODE
  NODE_ENV: process.env.NODE_ENV || '',
  SERVICE_NAME: process.env.SERVICE_NAME || '',
  GIT_SHA: process.env.GIT_SHA || '',
};
type EnvKeys = keyof typeof Env;
export const ENV = (key: EnvKeys) => Env[key];
