import * as Sentry from '@sentry/node';
import { httpIntegration, NodeOptions, rewriteFramesIntegration } from '@sentry/node';
import { configService } from './config';

const sentryConfig: NodeOptions = {
  dsn: configService.SENTRY_DSN,
  serverName: configService.SERVICE_NAME || 'swiftsend',
  environment: configService.NODE_ENV ?? 'development',
  release: configService.GIT_SHA,
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
  if (configService.SENTRY_DSN) {
    Sentry.init(sentryConfig);
  }
};
