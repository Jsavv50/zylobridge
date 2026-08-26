import React from "react";
import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const isProd = import.meta.env.PROD;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: isProd ? "production" : "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

export function setSentryUser(user: { id: number | string; role?: string } | null) {
  if (!sentryDsn) return;
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      role: user.role || "user",
    });
  } else {
    Sentry.setUser(null);
  }
}

export const ZylobridgeErrorBoundary = sentryDsn
  ? Sentry.withErrorBoundary(function DefaultFallback() {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }, { fallback: <div className="p-6 text-center text-muted-foreground">Application error occurred.</div> })
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;
