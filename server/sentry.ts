import * as Sentry from "@sentry/node";

const sentryDsn = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT === "production";

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.SENTRY_ENVIRONMENT || (isProd ? "production" : "development"),
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-api-key"];
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

export function captureBackendException(err: unknown, context?: Record<string, any>) {
  if (!sentryDsn) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}

export { Sentry };
