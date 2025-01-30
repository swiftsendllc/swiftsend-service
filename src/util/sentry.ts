import * as Sentry from '@sentry/node';
import { httpIntegration, NodeOptions, rewriteFramesIntegration } from '@sentry/node';
import { ENV } from './constants';

const sentryConfig: NodeOptions = {
  dsn: ENV('SENTRY_DSN'),
  serverName: ENV('SERVICE_NAME') || 'swiftsend',
  environment: ENV('NODE_ENV') ?? 'development',
  release: ENV('GIT_SHA'),
  tracesSampleRate:0,
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
  if (ENV('SENTRY_DSN')) {
    Sentry.init(sentryConfig);
  }
};
