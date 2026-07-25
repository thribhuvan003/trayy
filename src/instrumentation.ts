import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
      integrations: [
        Sentry.captureConsoleIntegration({ levels: ["error"] }),
      ],
      sendDefaultPii: false,
      initialScope: {
        tags: {
          project: "tray",
          component: "server",
        },
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
