/**
 * Structured logging utility for Tray (production-grade, minimal, extensible).
 *
 * Philosophy (matches senior-dev requirements from hardening plan):
 * - Every important action (payments, order state changes, webhooks, status updates, tenant ops) MUST log with rich context.
 * - Context keys: tenant_id, order_id, payment_id (razorpay or internal), user_id, razorpay_order_id, latency_ms, + arbitrary.
 * - Easy to swap backend later (Pino, Sentry, Datadog, etc.) without touching call sites.
 * - Starts with console + JSON for immediate observability on Vercel/Supabase logs.
 * - Graceful degradation: never throw on logging failure.
 *
 * Usage:
 *   import { logger } from "@/lib/logging";
 *   logger.info("order placed", { tenant_id, order_id, user_id, total_paise: total });
 *   const end = Date.now();
 *   logger.info("webhook processed", { ..., latency_ms: Date.now() - start });
 *
 * For per-request/request-scoped context:
 *   const log = logger.withContext({ tenant_id, request_id });
 *   log.warn("race avoided via guard", { order_id });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  tenant_id?: string;
  order_id?: string;
  payment_id?: string; // internal or razorpay_payment_id
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  user_id?: string;
  actor_user_id?: string;
  event_type?: string;
  status_from?: string;
  status_to?: string;
  latency_ms?: number;
  amount_paise?: number;
  error_code?: string;
  [key: string]: unknown; // allow arbitrary safe context
};

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, err?: unknown, ctx?: LogContext): void;
  withContext(base: LogContext): Logger;
}

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 500;
const SENSITIVE_KEY_RE = /(?:authorization|cookie|secret|token|password|passcode|otp|signature|api[_-]?key|service[_-]?role|raw[_-]?(?:body|payload|text)|payload|card|cvv|vpa|upi|phone|email)/i;
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi,
  /\brzp_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_=-]+\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
];

type Jsonish = null | boolean | number | string | Jsonish[] | { [key: string]: Jsonish };

function redactString(value: string) {
  const redacted = SENSITIVE_VALUE_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, REDACTED),
    value
  );
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...`
    : redacted;
}

function redactValue(value: unknown, key?: string, depth = 0): Jsonish {
  if (key && SENSITIVE_KEY_RE.test(key)) return REDACTED;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return redactError(value);
  if (depth >= 4) return "[Object]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactValue(item, undefined, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactValue(v, k, depth + 1)])
    );
  }
  return String(value);
}

function redactContext(ctx?: LogContext): LogContext | undefined {
  if (!ctx) return undefined;
  return redactValue(ctx) as LogContext;
}

function redactError(err: Error) {
  return {
    name: redactString(err.name),
    message: redactString(err.message),
    stack: err.stack ? redactString(err.stack) : undefined,
  };
}

function toSafeError(err: Error) {
  const redacted = redactError(err);
  const safe = new Error(redacted.message);
  safe.name = redacted.name;
  safe.stack = redacted.stack;
  return safe;
}

function format(level: LogLevel, msg: string, ctx?: LogContext, err?: unknown) {
  const ts = new Date().toISOString();
  const safeCtx = redactContext(ctx);
  const base = {
    ts,
    level,
    msg: redactString(msg),
    ...safeCtx,
  };
  if (err) {
    (base as any).error = err instanceof Error ? redactError(err) : redactValue(err);
  }
  return JSON.stringify(base);
}

function emit(level: LogLevel, msg: string, ctx?: LogContext, err?: unknown) {
  const safeCtx = redactContext(ctx);
  const safeMsg = redactString(msg);
  const line = format(level, safeMsg, safeCtx, err);
  if (level === "error") {
    console.error(line);
    // Report to Sentry — lazy import so the logger stays usable in edge/middleware
    // and in tests where @sentry/nextjs is not loaded.
    if (typeof process !== "undefined" && process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then(({ captureException, captureMessage, withScope }) => {
        withScope((scope) => {
          if (safeCtx) {
            Object.entries(safeCtx).forEach(([k, v]) => {
              if (v !== undefined) scope.setTag(k, String(v));
            });
          }
          scope.setTag("log_msg", safeMsg);
          if (err instanceof Error) {
            captureException(toSafeError(err));
          } else {
            captureMessage(safeMsg, "error");
          }
        });
      }).catch(() => {
        // Sentry not available — silently continue
      });
    }
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function createLogger(baseCtx: LogContext = {}): Logger {
  const log = (level: LogLevel, msg: string, ctx?: LogContext, err?: unknown) => {
    const merged = { ...baseCtx, ...ctx };
    try {
      emit(level, msg, merged, err);
    } catch {
      // Never let logging break the app
      console.error("[logging] failed to emit", { level, msg: redactString(msg) });
    }
  };

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, err, ctx) => log("error", msg, ctx, err),
    withContext: (extra) => createLogger({ ...baseCtx, ...extra }),
  };
}

export const logger: Logger = createLogger();

// Convenience for the most common "critical path" wrapper
export function withRequestContext(ctx: LogContext) {
  return logger.withContext(ctx);
}

// Example integration points (to be wired in Phase 1+):
// - webhook route: logger.withContext({ tenant_id, razorpay_payment_id, order_id }).info("webhook processed")
// - placeOrder: logger.withContext({ tenant_id, user_id }).info("order placed", { order_id, total_paise })
// - kitchen actions: logger.withContext({ tenant_id, actor_user_id: user.id }).info("status transition", { order_id, from, to })
// - reconcile cron: logger.info("reconcile run", { reconciled, refunded, tenant_count: ... })

export default logger;
