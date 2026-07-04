import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

function CouponHead({ label, device }: { label: string; device: string }) {
  return (
    <div
      style={{
        padding: "18px 22px 14px",
        borderBottom: "1.5px solid rgba(34,31,24,.85)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: ".16em", color: "var(--ink)" }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(34,31,24,.45)" }}>{device}</span>
    </div>
  );
}

function CouponBody({ title, copy }: { title: string; copy: string }) {
  return (
    <div style={{ padding: "20px 22px 0" }}>
      <h3 style={{ margin: "0 0 10px", fontFamily: ROZHA, fontWeight: 400, fontSize: 27, lineHeight: 1.12 }}>{title}</h3>
      <p style={{ margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.55, color: "rgba(34,31,24,.68)" }}>{copy}</p>
    </div>
  );
}

function CouponFoot() {
  return (
    <div style={{ padding: "18px 22px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span
        style={{
          fontWeight: 700,
          fontSize: 15.5,
          color: "var(--ink)",
          borderBottom: "1.5px solid var(--ink)",
          paddingBottom: 1,
        }}
      >
        Launch demo →
      </span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(34,31,24,.4)" }}>NO SIGN-UP</span>
    </div>
  );
}

export function CouponsSection() {
  return (
    <Reveal id="demos" style={{ padding: "100px 72px 96px 128px", maxWidth: 1440, boxSizing: "border-box", margin: "0 auto" }} className="lp-pad">
      <div style={{ position: "relative", marginBottom: 56 }}>
        <span className="lp-section-no">01</span>
        <h2
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--font-bricolage-lp), sans-serif",
            fontWeight: 800,
            fontSize: "clamp(36px, 4.4vw, 54px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.02,
            maxWidth: 640,
          }}
        >
          Three coupons. One book.
        </h2>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "rgba(34,31,24,.7)", maxWidth: 620, textWrap: "pretty" }}>
          Student, kitchen and admin all read from the same record. Tear off any coupon below — the demos are live, connected, and
          need no sign-up.
        </p>
      </div>

      <div className="lp-coupons-grid">
        {/* COUPON A — STUDENT */}
        <Link href="/demo/student" className="lp-coupon lp-coupon--left">
          <CouponHead label="COUPON A · STUDENT" device="MOBILE" />
          <CouponBody
            title="Order from any canteen"
            copy="Browse every open counter, pay by UPI, watch prep live, collect with your code."
          />
          <div
            style={{
              margin: "auto 22px 0",
              borderRadius: 5,
              background: "#17221C",
              color: "#F2EEE2",
              border: "5px solid #7A5236",
              padding: "11px 14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              boxShadow: "inset 0 0 24px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".16em", color: "#E8C860" }}>TODAY&apos;S BOARD</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(242,238,226,.45)" }}>LIVE</span>
            </div>
            {[
              ["Masala Dosa", "₹70"],
              ["Sweet Lassi", "₹40"],
            ].map(([item, price]) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13.5,
                  fontWeight: 500,
                  borderBottom: "1px dotted rgba(242,238,226,.25)",
                  paddingBottom: 5,
                }}
              >
                <span>{item}</span>
                <span style={{ fontFamily: MONO, color: "#E8C860" }}>{price}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: "rgba(242,238,226,.55)" }}>PAY BY UPI</span>
              <span style={{ padding: "3px 12px", borderRadius: 3, background: "#E8C860", color: "#17221C", fontWeight: 800, fontSize: 12.5 }}>
                ₹110 →
              </span>
            </div>
          </div>
          <CouponFoot />
        </Link>

        {/* COUPON B — KITCHEN */}
        <Link href="/demo/kitchen" className="lp-coupon">
          <CouponHead label="COUPON B · KITCHEN" device="TABLET" />
          <CouponBody
            title="Run the live queue"
            copy="Tickets land the second payment confirms. Prep timers count down; OTP clears the order."
          />
          <div
            style={{
              margin: "auto 22px 0",
              borderRadius: 5,
              background: "#15181B",
              color: "#EDEAE0",
              padding: "11px 14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontFamily: MONO,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 9, letterSpacing: ".16em", color: "#7FB79A" }}>THE QUEUE</span>
              <span style={{ fontSize: 9, color: "rgba(237,234,224,.4)", animation: "lpInkBlink 1.4s ease infinite" }}>● LIVE</span>
            </div>
            <div
              style={{
                background: "#F8F4E8",
                color: "#23201A",
                borderRadius: 3,
                borderLeft: "3px solid #2E7D52",
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700 }}>T-2425 · Biryani</span>
              <span style={{ fontWeight: 700, color: "#2E7D52" }}>READY</span>
            </div>
            <div
              style={{
                background: "#F8F4E8",
                color: "#23201A",
                borderRadius: 3,
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700 }}>T-2424 · Paneer</span>
              <span style={{ color: "rgba(35,32,26,.55)" }}>PREP 04M</span>
            </div>
            <div
              style={{
                background: "#F8F4E8",
                color: "#23201A",
                borderRadius: 3,
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                animation: "lpTicketDrop 2.8s cubic-bezier(.22,1,.36,1) infinite",
              }}
            >
              <span style={{ fontWeight: 700 }}>T-2426 · Thali</span>
              <span style={{ color: "#C13A2A", fontWeight: 700 }}>NEW</span>
            </div>
          </div>
          <CouponFoot />
        </Link>

        {/* COUPON C — ADMIN */}
        <Link href="/demo/admin" className="lp-coupon lp-coupon--right">
          <CouponHead label="COUPON C · ADMIN" device="DESKTOP" />
          <CouponBody
            title="See the whole operation"
            copy="Live orders, daily revenue, menu edits, staff access and a full audit log — one screen."
          />
          <div
            style={{
              margin: "auto 22px 0",
              border: "1px solid rgba(30,90,60,.5)",
              borderRadius: 5,
              background: "#FAF7EE",
              padding: "11px 14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderBottom: "1.5px solid #1E5A3C",
                paddingBottom: 5,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".16em", color: "#1E5A3C" }}>DAILY CASH BOOK</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(35,32,25,.45)" }}>3 CANTEENS</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em", color: "rgba(34,31,24,.5)" }}>TODAY</div>
                <div style={{ fontFamily: ROZHA, fontSize: 20, color: "#1E5A3C" }}>₹54.8k</div>
              </div>
              <div style={{ flex: 1, borderLeft: "1px dotted rgba(34,31,24,.45)", paddingLeft: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em", color: "rgba(34,31,24,.5)" }}>ORDERS</div>
                <div style={{ fontFamily: ROZHA, fontSize: 20 }}>412</div>
              </div>
              <div style={{ flex: 1, borderLeft: "1px dotted rgba(34,31,24,.45)", paddingLeft: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em", color: "rgba(34,31,24,.5)" }}>CUT</div>
                <div style={{ fontFamily: ROZHA, fontSize: 20, color: "#C13A2A" }}>0%</div>
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".1em", color: "rgba(35,32,25,.5)" }}>
              ONE SIGN-IN · EVERY COUNTER ON CAMPUS
            </div>
          </div>
          <CouponFoot />
        </Link>
      </div>
    </Reveal>
  );
}
