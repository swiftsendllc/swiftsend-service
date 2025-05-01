import * as Sentry from '@sentry/node';
import { httpIntegration, NodeOptions, rewriteFramesIntegration } from '@sentry/node';
import { getEnv } from './constants';

const sentryConfig: NodeOptions = {
  dsn: getEnv('SENTRY_DSN'),
  serverName: getEnv('SERVICE_NAME') || 'swiftsend',
  environment: getEnv('NODE_ENV') ?? 'development',
  release: getEnv('GIT_SHA'),
  tracesSampleRate: 0,
  beforeSend(event, hint) {
    if (event.exception && event.exception.values && event.exception.values.length > 0) {
      return event;
    }
    return null;
  },
  integrations: [
    rewriteFramesIntegration({
      iteratee(frame) {
        if (frame.filename) {
          const filename = frame.filename.replace(process.cwd(), '');
          frame.filename = filename.replace(/\\/g, '/');
        }
        return frame;
      },
    }),
    httpIntegration({ breadcrumbs: false }),
  ],
};

export const sentry = () => {
  if (getEnv('SENTRY_DSN')) {
    Sentry.init(sentryConfig);
  }
};
