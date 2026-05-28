"use client";

import Link from "next/link";
import { useState } from "react";
import { LoginForm } from "@/components/portal-student/login-form";

type Role = "student" | "kitchen" | "owner";

const ROLES: {
  id: Role;
  label: string;
  icon: string;
  headline: string;
  accent: string;
  sub: string;
  cta: string;
}[] = [
  {
    id: "student",
    label: "Student",
    icon: "→",
    headline: "Order food,\nskip the queue.",
    accent: "Eat sooner.",
    sub: "Use any email. Get a magic link in seconds — no password needed.",
    cta: "Send magic link",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    icon: "→",
    headline: "Manage orders,\nserve faster.",
    accent: "Kitchen view.",
    sub: "Sign in with your email or PIN. Your admin sets up your access.",
    cta: "Sign in to kitchen",
  },
  {
    id: "owner",
    label: "Admin",
    icon: "→",
    headline: "Your canteen,\nyour dashboard.",
    accent: "Full control.",
    sub: "Any email works. Access menus, staff, payments, and live analytics.",
    cta: "Sign in to admin",
  },
];

export function LoginRoleTabs({
  initialRole,
  next,
  slug,
  error,
}: {
  initialRole: Role;
  next: string;
  slug: string;
  error?: string;
}) {
  const [activeRole, setActiveRole] = useState<Role>(initialRole);
  const role = ROLES.find((r) => r.id === activeRole) ?? ROLES[0];

  return (
    <div className="flex flex-col">
      {/* ── Role selector ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-8">
        {ROLES.map((r) => {
          const isActive = activeRole === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRole(r.id)}
              className="flex-1 py-2.5 rounded-xl text-[11.5px] font-bold uppercase tracking-[0.16em] transition-all duration-200 focus:outline-none select-none"
              style={{
                fontFamily: "var(--font-dm-mono, monospace)",
                background: isActive ? "var(--color-ink, #1A1A19)" : "transparent",
                color: isActive ? "var(--color-paper, #F4EFE6)" : "var(--color-ink, #1A1A19)",
                opacity: isActive ? 1 : 0.35,
                border: isActive ? "1px solid var(--color-ink, #1A1A19)" : "1px solid rgba(26,26,25,0.15)",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div className="mb-7">
        <h1
          className="leading-[0.88] tracking-[-0.04em] uppercase"
          style={{
            fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)",
            fontWeight: 900,
            fontSize: "clamp(2.6rem, 7vw, 4rem)",
            color: "var(--color-ink, #1A1A19)",
            whiteSpace: "pre-line",
          }}
        >
          {role.headline.split("\n").map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {i === 1 ? (
                <span
                  style={{
                    fontFamily: "var(--font-fraunces, serif)",
                    fontStyle: "italic",
                    textTransform: "none",
                    fontWeight: 400,
                    color: "var(--color-ocean-500, #e60000)",
                  }}
                >
                  {line}
                </span>
              ) : line}
            </span>
          ))}
        </h1>
        <p
          className="mt-3 text-[14px] leading-[1.6]"
          style={{ color: "var(--color-ink, #1A1A19)", opacity: 0.52 }}
        >
          {role.sub}
        </p>
      </div>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {error && (
        <div
          className="mb-5 rounded-2xl border px-4 py-3 text-[13px] leading-[1.55]"
          style={{
            borderColor: "rgba(230,0,0,0.2)",
            background: "rgba(230,0,0,0.04)",
            color: "#c00",
          }}
        >
          {error}
          {(error.toLowerCase().includes("no account") ||
            error.toLowerCase().includes("sign up") ||
            error.toLowerCase().includes("found")) && (
            <span className="ml-1">
              <Link
                href={slug ? `/c/${slug}/signup?next=${encodeURIComponent(next)}&role=${activeRole}` : `/signup?next=${encodeURIComponent(next)}&role=${activeRole}`}
                className="font-semibold underline underline-offset-2"
              >
                Create account →
              </Link>
            </span>
          )}
        </div>
      )}

      {/* ── Login form ────────────────────────────────────────────── */}
      <LoginForm next={next} slug={slug} />

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="mt-7 pt-5 border-t border-[color:var(--color-line)] flex flex-col gap-2">
        {activeRole !== "owner" ? (
          <p
            className="text-[13px]"
            style={{ color: "var(--color-ink, #1A1A19)", opacity: 0.5 }}
          >
            New here?{" "}
            <Link
              href={slug ? `/c/${slug}/signup?next=${encodeURIComponent(next)}&role=${activeRole}` : `/signup?next=${encodeURIComponent(next)}&role=${activeRole}`}
              className="font-semibold hover:underline underline-offset-2"
              style={{ color: "var(--color-ocean-500, #e60000)", opacity: 1 }}
            >
              Create your account
            </Link>
          </p>
        ) : null}

        <p
          className="text-[13px]"
          style={{ color: "var(--color-ink, #1A1A19)", opacity: 0.5 }}
        >
          Own a canteen?{" "}
          <Link
            href="/get-started"
            className="font-semibold hover:underline underline-offset-2"
            style={{ color: "var(--color-ocean-500, #e60000)", opacity: 1 }}
          >
            Set up your canteen on Tray →
          </Link>
        </p>
      </div>
    </div>
  );
}
