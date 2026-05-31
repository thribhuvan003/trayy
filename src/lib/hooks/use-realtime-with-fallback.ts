"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";

export type ChannelStatus = "connected" | "connecting" | "disconnected";

export type PostgresFilter = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  filter?: string;
};

type Options = {
  /** Called when the WebSocket channel fires a postgres_changes event. */
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Called on each polling tick when the WebSocket is down. Typically router.refresh(). */
  onFallbackPoll: () => void;
  /** How often to poll when the WebSocket is down. Default: 30_000ms. */
  pollIntervalMs?: number;
};

/**
 * Subscribes to a Supabase Realtime channel and automatically falls back to
 * periodic polling when the WebSocket drops (e.g. Supabase connection ceiling
 * at 500 concurrent connections on Pro plan — easy to hit at VIT/IITB lunch).
 *
 * Reconnect uses exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped).
 * When reconnect succeeds, polling stops and live updates resume automatically.
 *
 * Pattern: Linear's offline indicator (backoff + badge) +
 *          Vercel chat SDK polling fallback (30s interval).
 */
export function useRealtimeWithFallback(
  channelName: string,
  filters: PostgresFilter[],
  opts: Options
): ChannelStatus {
  const { onEvent, onFallbackPoll, pollIntervalMs = 30_000 } = opts;

  const [status, setStatus] = useState<ChannelStatus>("connecting");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1_000);
  const mountedRef = useRef(true);

  // Stable refs so subscribe/reconnect closures don't capture stale callbacks.
  const onEventRef = useRef(onEvent);
  const onFallbackPollRef = useRef(onFallbackPoll);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onFallbackPollRef.current = onFallbackPoll; }, [onFallbackPoll]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      onFallbackPollRef.current();
    }, pollIntervalMs);
  }, [pollIntervalMs]);

  const subscribe = useCallback(() => {
    if (!mountedRef.current) return;
    const sb = getBrowserClient();

    // Build the channel fresh on each (re)subscribe attempt.
    let ch = sb.channel(channelName);
    for (const f of filters) {
      ch = ch.on(
        "postgres_changes" as Parameters<typeof ch.on>[0],
        { event: f.event, schema: f.schema, table: f.table, filter: f.filter },
        (payload) => { onEventRef.current(payload as RealtimePostgresChangesPayload<Record<string, unknown>>); }
      );
    }

    ch.subscribe((s) => {
      if (!mountedRef.current) return;

      if (s === "SUBSCRIBED") {
        setStatus("connected");
        stopPolling();
        backoffRef.current = 1_000; // reset on successful connect
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
        setStatus("disconnected");
        startPolling();

        // Schedule reconnect with exponential backoff (RFC 6455 §7.2.3).
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);

        reconnectTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          if (channelRef.current) {
            sb.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          setStatus("connecting");
          subscribe();
        }, delay);
      }
    });

    channelRef.current = ch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, startPolling, stopPolling]);
  // `filters` intentionally omitted: callers define filters outside render (stable).

  useEffect(() => {
    mountedRef.current = true;
    backoffRef.current = 1_000;
    subscribe();

    return () => {
      mountedRef.current = false;
      stopPolling();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const sb = getBrowserClient();
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]); // re-subscribe only when tenant changes

  return status;
}
