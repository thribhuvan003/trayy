"use client";

import React from "react";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-mono), monospace";
const ROZHA = "var(--font-display), serif";
const SCENE_MS = 5000;

const STEP_TITLES = [
  "UPI pe pay",
  "Kitchen queue (optional)",
  "Token / hand-over",
  "Cash book settle",
];

function SceneStudent() {
  return (
    <div style={{ position: "relative", animation: "lpSceneIn .45s ease both" }}>
      <div
        style={{
          width: "min(540px, 82vw)",
          background: "#17221C",
          color: "#F2EEE2",
          border: "10px solid #7A5236",
          borderRadius: 6,
          boxShadow: "inset 0 0 44px rgba(0,0,0,.5), 0 18px 40px -16px rgba(0,0,0,.4)",
          padding: "22px 28px 24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: "4px 12px",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".18em", color: "#E8C860" }}>
            CUSTOMER · TODAY&apos;S BOARD
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: ".12em",
              color: "rgba(242,238,226,.5)",
              whiteSpace: "nowrap",
            }}
          >
            STALL NO. 7 · MG ROAD
          </span>
        </div>
        {[
          ["Masala Dosa × 1", "₹70", ".2s"],
          ["Filter Coffee × 2", "₹50", ".5s"],
        ].map(([item, price, delay]) => (
          <div
            key={item}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "9px 0",
              borderBottom: "1px dotted rgba(242,238,226,.25)",
              animation: `lpRise .4s ease ${delay} both`,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 16.5 }}>{item}</span>
            <span style={{ fontFamily: MONO, color: "#E8C860", fontWeight: 600 }}>{price}</span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
            gap: 12,
            flexWrap: "wrap",
            animation: "lpRise .4s ease .8s both",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: "rgba(242,238,226,.55)" }}>
            GOES TO STALL-07@UPI
          </span>
          <span style={{ padding: "10px 22px", borderRadius: 4, background: "#E8C860", color: "#17221C", fontWeight: 800, fontSize: 15.5 }}>
            Pay ₹120 by UPI →
          </span>
        </div>
      </div>
      <div
        aria-hidden
        className="lp-scene-stamp"
        style={{
          position: "absolute",
          top: "34%",
          right: -34,
          padding: "7px 16px",
          border: "3px double #C13A2A",
          borderRadius: 8,
          color: "#C13A2A",
          background: "rgba(255,253,246,.85)",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 21,
          letterSpacing: ".2em",
          animation: "lpStampIn .45s cubic-bezier(.34,1.4,.64,1) 2s both",
        }}
      >
        PAID
      </div>
    </div>
  );
}

function SceneKitchen() {
  return (
    <div style={{ animation: "lpSceneIn .45s ease both" }}>
      <div
        style={{
          width: "min(540px, 82vw)",
          background: "#15181B",
          color: "#EDEAE0",
          borderRadius: 6,
          boxShadow: "0 18px 40px -16px rgba(0,0,0,.45)",
          padding: "22px 28px 26px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".18em", color: "#7FB79A" }}>
            KITCHEN · NEW ORDERS
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: ".12em",
              color: "rgba(237,234,224,.45)",
              animation: "lpInkBlink 1.2s ease infinite",
            }}
          >
            ● LIVE
          </span>
        </div>
        <div
          style={{
            background: "#F8F4E8",
            color: "#23201A",
            borderRadius: 5,
            padding: "16px 20px",
            animation: "lpTicketDrop .6s cubic-bezier(.22,1,.36,1) .4s both",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1.5px dashed rgba(35,32,26,.3)",
              paddingBottom: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: ".02em" }}>T-2431</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(35,32,26,.55)" }}>You (demo) · pre-paid</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 4 }}>Masala Dosa × 1</div>
          <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 12 }}>Filter Coffee × 2</div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(35,32,26,.12)", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#2E7D52", borderRadius: 3, animation: "lpFillBar 3.4s linear 1s both" }} />
          </div>
          <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, color: "rgba(35,32,26,.5)" }}>
            prep target 04:00 — timer already running
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneOtp() {
  return (
    <div style={{ position: "relative", animation: "lpSceneIn .45s ease both" }}>
      <div
        style={{
          width: "min(540px, 82vw)",
          background: "#15181B",
          color: "#EDEAE0",
          borderRadius: 6,
          boxShadow: "0 18px 40px -16px rgba(0,0,0,.45)",
          padding: "22px 28px 26px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: "4px 12px",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".18em", color: "#7FB79A" }}>
            KITCHEN · READY — VERIFY OTP
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: ".12em",
              color: "rgba(237,234,224,.45)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            T-2431
          </span>
        </div>
        <div style={{ background: "#F8F4E8", color: "#23201A", borderRadius: 5, borderLeft: "5px solid #2E7D52", padding: "18px 20px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(35,32,26,.55)", marginBottom: 10 }}>
            CUSTOMER SHOWS THEIR CODE
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {["4", "8", "2", "1"].map((d, i) => (
              <span
                key={i}
                style={{
                  width: 42,
                  height: 50,
                  display: "grid",
                  placeItems: "center",
                  border: "1.5px solid rgba(35,32,26,.8)",
                  borderRadius: 5,
                  background: "#FFFDF4",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 23,
                  color: "var(--ink)",
                  animation: `lpPopIn .35s ease ${0.5 + i * 0.25}s both`,
                }}
              >
                {d}
              </span>
            ))}
            <span
              style={{
                marginLeft: 12,
                padding: "12px 22px",
                borderRadius: 4,
                background: "#2E7D52",
                color: "#F8F4E8",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Hand over ✓
            </span>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="lp-scene-stamp"
        style={{
          position: "absolute",
          bottom: 22,
          right: -30,
          padding: "7px 16px",
          border: "3px double #C13A2A",
          borderRadius: 8,
          color: "#C13A2A",
          background: "rgba(255,253,246,.9)",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: ".16em",
          animation: "lpStampIn .45s cubic-bezier(.34,1.4,.64,1) 2.1s both",
        }}
      >
        HANDED OVER
      </div>
    </div>
  );
}

function SceneAdmin() {
  return (
    <div style={{ position: "relative", animation: "lpSceneIn .45s ease both" }}>
      <div
        style={{
          width: "min(540px, 82vw)",
          background: "#F5F1E4",
          color: "#232019",
          border: "1.5px solid rgba(35,32,25,.5)",
          borderRadius: 6,
          boxShadow: "0 18px 40px -16px rgba(0,0,0,.3)",
          padding: "22px 28px 24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "2px solid #1E5A3C",
            paddingBottom: 10,
            marginBottom: 6,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".18em", color: "#1E5A3C" }}>
            ADMIN · DAILY CASH BOOK
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: ".12em",
              color: "#1E5A3C",
              animation: "lpInkBlink 1.2s ease infinite",
            }}
          >
            ● LIVE
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "9px 0",
            borderBottom: "1px solid rgba(35,32,25,.18)",
            fontSize: 14.5,
            color: "rgba(35,32,25,.55)",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 12.5 }}>T-2430</span>
          <span>Veg Thali × 1</span>
          <span style={{ fontFamily: MONO }}>₹120</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "9px 0",
            borderBottom: "1px solid rgba(35,32,25,.18)",
            fontWeight: 700,
            fontSize: 15,
            animation: "lpRise .5s ease .6s both",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>T-2431</span>
          <span>Dosa + Coffee × 2 — COLLECTED</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, color: "#1E5A3C" }}>₹120</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 14,
            animation: "lpRise .5s ease 1.2s both",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(35,32,25,.6)" }}>
            EXAMPLE UI · NOT LIVE TOTALS
          </span>
          <span style={{ fontFamily: ROZHA, fontSize: 24, color: "#1E5A3C" }}>₹—</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(30,90,60,.07)",
            border: "1.5px dashed rgba(30,90,60,.45)",
            borderRadius: 4,
            gap: 10,
            flexWrap: "wrap",
            animation: "lpRise .5s ease 1.7s both",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: "#1E5A3C", fontWeight: 700 }}>
            REAL TOTALS LIVE IN YOUR ADMIN
          </span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: "#1E5A3C", fontWeight: 700 }}>₹0 commission</span>
        </div>
      </div>
      <div
        aria-hidden
        className="lp-scene-stamp"
        style={{
          position: "absolute",
          top: -16,
          right: -26,
          padding: "7px 16px",
          border: "3px double #1E5A3C",
          borderRadius: 8,
          color: "#1E5A3C",
          background: "rgba(245,241,228,.9)",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: ".14em",
          animation: "lpStampInFlat .45s cubic-bezier(.34,1.4,.64,1) 1.8s both",
        }}
      >
        SETTLED · 0% CUT
      </div>
    </div>
  );
}

const SCENES = [SceneStudent, SceneKitchen, SceneOtp, SceneAdmin];

export function WalkthroughSection() {
  const [scene, setScene] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = React.useRef(playing);
  playingRef.current = playing;

  const startTimer = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (playingRef.current) setScene((s) => (s + 1) % 4);
    }, SCENE_MS);
  }, []);

  React.useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const Scene = SCENES[scene];

  return (
    <Reveal id="walkthrough" className="lp-band-walk" from="right">
      <div>
        <div className="lp-sec-head">
          <p className="lp-sec-kicker">02 · Watch one order</p>
          <h2 className="lp-sec-title">One order, four screens</h2>
          <p className="lp-sec-lede">
            About 20 seconds, auto-playing — the actual flow on sample data. Pick a step to jump.
          </p>
          <div className="lp-chips">
            <span className="lp-chip">QR → UPI → token</span>
            <span className="lp-chip">₹0 cut</span>
            <span className="lp-chip lp-chip--ink">Kitchen optional</span>
          </div>
        </div>

        <div className="lp-stage-frame">
          <div className="lp-stage">
            <Scene key={scene} />
          </div>
          <div className="lp-steprail">
            {STEP_TITLES.map((title, i) => {
              const active = scene === i;
              return (
                <button
                  key={title}
                  type="button"
                  className={`lp-step-btn${active ? " lp-step-btn--active" : ""}`}
                  onClick={() => {
                    setScene(i);
                    setPlaying(true);
                    startTimer();
                  }}
                >
                  <span className="lp-step-num">Step 0{i + 1}</span>
                  <span className="lp-step-title">{title}</span>
                  <span className="lp-step-track" aria-hidden />
                  {active && (
                    <span
                      key={`${scene}-bar`}
                      className="lp-step-progress"
                      aria-hidden
                      style={{ animationPlayState: playing ? "running" : "paused" }}
                    />
                  )}
                </button>
              );
            })}
            <button type="button" className="lp-play-btn" onClick={() => setPlaying((p) => !p)}>
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
