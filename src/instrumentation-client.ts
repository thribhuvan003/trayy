import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  sendDefaultPii: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error exception captured",
    /^Loading chunk/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
