"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Delete, X } from "lucide-react";
import { verifyStaffPinAction } from "@/app/(kitchen)/_actions";

type StaffProfile = {
  id: string;
  user_id: string;
  display_name: string;
  locked_until: string | null;
};

// Deterministic color palette keyed by first char so it's stable across renders.
const AVATAR_COLORS = [
  "bg-tomato-500 text-cream-50",
  "bg-emerald-600 text-cream-50",
  "bg-indigo-500 text-cream-50",
  "bg-amber-500 text-graphite-900",
  "bg-violet-500 text-cream-50",
  "bg-cyan-600 text-cream-50",
  "bg-rose-500 text-cream-50",
  "bg-teal-600 text-cream-50",
];

function avatarColor(name: string): string {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? "bg-tomato-500 text-cream-50";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function isLocked(profile: StaffProfile): boolean {
  return Boolean(profile.locked_until && new Date(profile.locked_until) > new Date());
}

// ── PIN Pad ───────────────────────────────────────────────────────────────────

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex gap-3 justify-center" aria-label={`${filled} of ${length} digits entered`}>
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-4 h-4 rounded-full border-2 border-tomato-900 dark:border-cream-200 transition-all duration-100",
            i < filled ? "bg-tomato-500" : "bg-transparent",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function useCountdown(lockedUntil: string | null): number {
  const [secsLeft, setSecsLeft] = useState(0);

  useEffect(() => {
    if (!lockedUntil) { setSecsLeft(0); return; }
    const calc = () => Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
    setSecsLeft(calc());
    const id = setInterval(() => setSecsLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  return secsLeft;
}

function LockCountdown({ lockedUntil }: { lockedUntil: string }) {
  const secs = useCountdown(lockedUntil);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span className="font-mono tabular-nums text-tomato-500">
      {mins}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({
  profile,
  onSelect,
}: {
  profile: StaffProfile;
  onSelect: (profile: StaffProfile) => void;
}) {
  const locked = isLocked(profile);
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onSelect(profile)}
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all duration-150",
        "min-w-[140px] min-h-[160px]",
        locked
          ? "border-tomato-900/20 dark:border-cream-200/10 opacity-40 cursor-not-allowed"
          : "border-tomato-900 dark:border-cream-200/40 hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 active:scale-95 cursor-pointer",
      ].join(" ")}
      aria-label={locked ? `${profile.display_name} — account locked` : `Login as ${profile.display_name}`}
    >
      <span
        className={[
          "flex items-center justify-center w-16 h-16 rounded-full text-xl font-bold select-none",
          avatarColor(profile.display_name),
        ].join(" ")}
        aria-hidden
      >
        {initials(profile.display_name)}
      </span>
      <span className="text-sm font-medium text-center leading-tight">
        {profile.display_name}
      </span>
      {locked && profile.locked_until && (
        <span className="text-[10px] font-mono text-tomato-500">
          Locked <LockCountdown lockedUntil={profile.locked_until} />
        </span>
      )}
    </button>
  );
}

// ── PIN Modal ─────────────────────────────────────────────────────────────────

type PinModalState =
  | { phase: "entry"; pin: string; error: string | null; submitting: boolean }
  | { phase: "locked"; lockedUntil: string };

function PinModal({
  profile,
  onClose,
  onSuccess,
}: {
  profile: StaffProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, setState] = useState<PinModalState>({ phase: "entry", pin: "", error: null, submitting: false });
  const [shake, setShake] = useState(false);
  // Keep a ref in sync so async callbacks always read the latest pin without
  // needing to re-close over state (avoids the stale-closure trap).
  const pinRef = useRef("");
  const submittingRef = useRef(false);
  const PIN_MAX = 6;
  const PIN_MIN = 4;

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const appendDigit = useCallback((d: string) => {
    if (d === "*" || d === "#") return;
    if (submittingRef.current) return;
    setState((prev) => {
      if (prev.phase !== "entry") return prev;
      if (prev.pin.length >= PIN_MAX) return prev;
      const next = prev.pin + d;
      pinRef.current = next;
      return { ...prev, pin: next, error: null };
    });
  }, []);

  const backspace = useCallback(() => {
    if (submittingRef.current) return;
    setState((prev) => {
      if (prev.phase !== "entry") return prev;
      const next = prev.pin.slice(0, -1);
      pinRef.current = next;
      return { ...prev, pin: next, error: null };
    });
  }, []);

  const clear = useCallback(() => {
    if (submittingRef.current) return;
    pinRef.current = "";
    setState((prev) => prev.phase === "entry" ? { ...prev, pin: "", error: null } : prev);
  }, []);

  const doSubmit = useCallback(async (pin: string) => {
    if (submittingRef.current) return;
    if (pin.length < PIN_MIN) {
      triggerShake();
      setState((prev) => prev.phase === "entry" ? { ...prev, error: `PIN must be at least ${PIN_MIN} digits` } : prev);
      return;
    }
    submittingRef.current = true;
    setState((prev) => prev.phase === "entry" ? { ...prev, submitting: true, error: null } : prev);

    const result = await verifyStaffPinAction(profile.user_id, pin);
    submittingRef.current = false;

    if (result.ok) {
      onSuccess();
      return;
    }

    if (result.locked && result.lockedUntil) {
      setState({ phase: "locked", lockedUntil: result.lockedUntil });
      return;
    }

    triggerShake();
    pinRef.current = "";
    setState({ phase: "entry", pin: "", error: result.error ?? "Wrong PIN", submitting: false });
  }, [profile.user_id, onSuccess, triggerShake]);

  // Auto-submit at PIN_MAX digits.
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (state.phase !== "entry") return;
    if (state.pin.length === PIN_MAX && prevLengthRef.current < PIN_MAX) {
      prevLengthRef.current = PIN_MAX;
      void doSubmit(state.pin);
    } else {
      prevLengthRef.current = state.pin.length;
    }
  }, [state, doSubmit]);

  // Keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") appendDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") onClose();
      else if (e.key === "Enter") void doSubmit(pinRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendDigit, backspace, onClose, doSubmit]);

  const isEntry = state.phase === "entry";
  const pin = isEntry ? state.pin : "";
  const error = isEntry ? state.error : null;
  const submitting = isEntry ? state.submitting : false;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`Enter PIN for ${profile.display_name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-900/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-cream-50 dark:bg-graphite-900 border-2 border-tomato-900 dark:border-cream-200/40 shadow-[8px_8px_0_0_var(--color-tomato-900)] dark:shadow-[8px_8px_0_0_rgba(247,200,194,0.3)] p-6 sm:p-8 w-[min(360px,92vw)]">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel PIN entry"
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-tomato-900/10 dark:hover:bg-cream-200/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <span
            className={[
              "flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold",
              avatarColor(profile.display_name),
            ].join(" ")}
            aria-hidden
          >
            {initials(profile.display_name)}
          </span>
          <p className="text-base font-semibold">{profile.display_name}</p>
          <p className="text-[11px] font-mono uppercase tracking-widest text-tomato-900/60 dark:text-cream-200/50">
            Enter your PIN
          </p>
        </div>

        {state.phase === "locked" ? (
          <div className="text-center space-y-3">
            <p className="text-tomato-500 font-semibold">Account locked</p>
            <p className="text-sm text-tomato-900/70 dark:text-cream-200/70">
              Too many wrong attempts. Try again in{" "}
              <LockCountdown lockedUntil={state.lockedUntil} />
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2 border-2 border-tomato-900 dark:border-cream-200 font-medium text-sm hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
            >
              Back
            </button>
          </div>
        ) : (
          <>
            {/* PIN dots */}
            <div className={["mb-4 transition-transform", shake ? "animate-shake" : ""].join(" ")}>
              <PinDots length={PIN_MAX} filled={pin.length} />
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-center text-sm text-tomato-500 font-medium mb-4">
                {error}
              </p>
            )}

            {/* Keypad 3×4 */}
            <div
              className={["grid grid-cols-3 gap-2", shake ? "animate-shake" : ""].join(" ")}
              aria-label="PIN keypad"
            >
              {PAD_KEYS.map((k) => {
                const isDigit = k !== "*" && k !== "#";
                const isClear = k === "*";
                const isBack = k === "#";
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (isClear) clear();
                      else if (isBack) backspace();
                      else appendDigit(k);
                    }}
                    aria-label={isClear ? "Clear" : isBack ? "Backspace" : k}
                    className={[
                      "flex items-center justify-center rounded-xl border-2 h-[80px] text-xl font-bold select-none transition-all duration-100",
                      "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                      isDigit
                        ? "border-tomato-900 dark:border-cream-200/40 hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900"
                        : "border-tomato-900/30 dark:border-cream-200/20 text-tomato-900/60 dark:text-cream-200/60 hover:bg-tomato-900/10 dark:hover:bg-cream-200/10 text-base",
                    ].join(" ")}
                  >
                    {isClear ? <span className="text-sm font-semibold">CLR</span> : isBack ? <Delete size={20} /> : k}
                  </button>
                );
              })}
            </div>

            {/* Submit */}
            <button
              type="button"
              disabled={submitting || pin.length < PIN_MIN}
              onClick={() => void doSubmit(pinRef.current)}
              className="mt-4 w-full h-[54px] border-2 border-tomato-900 dark:border-cream-200 font-bold text-base tracking-wide hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Verifying…" : "Confirm"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main kiosk ────────────────────────────────────────────────────────────────

export function PinKiosk({
  tenantSlug,
  tenantName,
  profiles,
}: {
  tenantSlug: string;
  tenantName: string;
  profiles: StaffProfile[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<StaffProfile | null>(null);

  const handleSuccess = useCallback(() => {
    router.push("/kitchen");
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-tomato-900 bg-cream-50 dark:bg-graphite-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-tomato-900 dark:text-cream-200">
          <ChefHat size={22} />
          <span className="font-mono text-xs uppercase tracking-widest opacity-70">{tenantName}</span>
        </div>
        <a
          href={`/c/${tenantSlug}/kitchen`}
          className="text-[11px] font-mono uppercase tracking-widest text-tomato-900/50 dark:text-cream-200/50 hover:text-tomato-500 transition-colors"
        >
          Back to board
        </a>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="font-display text-[28px] sm:text-[36px] font-medium tracking-[-0.025em] text-center mb-2">
          Who&apos;s cooking{" "}
          <span className="italic text-tomato-500">today?</span>
        </h1>
        <p className="text-sm text-tomato-900/60 dark:text-cream-200/60 mb-10 text-center">
          Tap your name and enter your PIN
        </p>

        {profiles.length === 0 ? (
          <div className="border-2 border-tomato-900/20 px-8 py-6 text-center text-tomato-900/50 dark:text-cream-200/50">
            <p className="font-mono text-sm">No active staff profiles found.</p>
            <p className="text-xs mt-1 font-mono">Ask an admin to add staff members.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center max-w-3xl">
            {profiles.map((p) => (
              <StaffCard key={p.id} profile={p} onSelect={setSelected} />
            ))}
          </div>
        )}
      </main>

      {/* PIN modal */}
      {selected && (
        <PinModal
          profile={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
