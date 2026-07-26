import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://qstash-eu-central-1.upstash.io https://qstash.upstash.io https://*.upstash.io https://api.razorpay.com https://*.sentry.io https://o4511462728925185.ingest.de.sentry.io",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "mepowrsrbjddaqfvzvtc.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry org: tray-k9 | project: javascript-nextjs
  org: "tray-k9",
  project: "javascript-nextjs",

  // Upload source maps to Sentry for readable stack traces in production
  // Set SENTRY_AUTH_TOKEN in Vercel env vars to enable
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silence Sentry build output unless there's an error
  silent: !process.env.CI,

  // Hides source maps from the browser bundle (security best practice)
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },

  // Disable the automatic Sentry tunnel route (reduces bundle size)
  tunnelRoute: undefined,

  // Disable Sentry's auto-instrumentation of the entire app
  // (we do it explicitly in the config files above)
  webpack: {
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: true,
    autoInstrumentAppDirectory: true,
  },
});
