"use client";

import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

// Paper-ledger palette (matches the landing theme in landing/ledger.css).
const PAPER = "#fffdf6";
const INK = "#221f18";
const BLUE = "#1d3fbf";
const RED = "#c13a2a";
const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const SERIF = "var(--font-fraunces), ui-serif, Georgia, serif";

export function QrPoster({
  outletName,
  menuUrl,
  upiVpa,
}: {
  outletName: string;
  menuUrl: string;
  upiVpa: string | null;
}) {
  return (
    <div className="qr-poster-stage">
      {/* Print-scoped stylesheet + stamp animation. Scoped to this route because
          the component (and this <style>) only mount while on /admin/qr. */}
      <style>{`
        .qr-poster-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 8px 0 40px;
        }
        @keyframes qrStampIn {
          0% { opacity: 0; transform: rotate(-9deg) scale(1.5); }
          60% { opacity: 1; transform: rotate(-9deg) scale(0.94); }
          100% { opacity: 1; transform: rotate(-9deg) scale(1); }
        }
        .qr-stamp { animation: qrStampIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .qr-stamp { animation: none; }
        }
        @media print {
          @page { size: auto; margin: 14mm; }
          [data-portal="admin"] aside,
          [data-portal="admin"] header,
          [data-portal="admin"] footer,
          [data-portal="admin"] nav,
          .grid-paper,
          .qr-noprint { display: none !important; }
          html, body, [data-portal="admin"], main { background: #fff !important; }
          main { padding: 0 !important; }
          .qr-poster-stage { display: block !important; padding: 0 !important; }
          .qr-poster {
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* On-screen toolbar — hidden when printing */}
      <div className="qr-noprint w-full max-w-[420px]">
        <div className="mb-4">
          <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">
            Counter QR poster
          </h1>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 mt-0.5">
            Print &amp; tape to your stall — customers scan to order
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[3px] text-[14px] font-semibold transition-transform"
          style={{
            background: BLUE,
            color: PAPER,
            boxShadow: "0 2px 0 rgba(34,31,24,0.9)",
          }}
        >
          <Printer size={15} strokeWidth={2} />
          Print poster
        </button>
      </div>

      {/* ── The poster ─────────────────────────────────────────── */}
      <div
        className="qr-poster"
        style={{
          width: "100%",
          maxWidth: 420,
          background: PAPER,
          color: INK,
          border: `1.5px solid ${INK}`,
          borderRadius: 6,
          boxShadow: "6px 8px 0 rgba(34,31,24,0.14)",
          padding: "34px 34px 30px",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* Masthead tag */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: RED,
            fontWeight: 600,
            borderBottom: `1.5px solid ${INK}`,
            paddingBottom: 10,
            marginBottom: 18,
          }}
        >
          Scan &amp; Pay
        </div>

        {/* Outlet name */}
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 34,
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: 6,
            wordBreak: "break-word",
          }}
        >
          {outletName}
        </div>

        {/* Instruction */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            letterSpacing: "0.06em",
            color: "rgba(34,31,24,0.7)",
            marginBottom: 22,
          }}
        >
          Scan to order &amp; pay
        </div>

        {/* QR + stamp */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <div
            aria-label={`QR code linking to ${menuUrl}`}
            role="img"
            style={{
              background: "#ffffff",
              border: `1.5px solid ${INK}`,
              borderRadius: 4,
              padding: 14,
              lineHeight: 0,
            }}
          >
            <QRCode
              value={menuUrl}
              size={208}
              level="M"
              bgColor="#ffffff"
              fgColor={INK}
              style={{ height: "auto", width: 208, maxWidth: "100%" }}
            />
          </div>
          <div
            className="qr-stamp"
            style={{
              position: "absolute",
              top: -14,
              right: -18,
              transform: "rotate(-9deg)",
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: RED,
              background: "rgba(255,253,246,0.92)",
              border: `2px solid ${RED}`,
              borderRadius: 4,
              padding: "4px 8px",
            }}
          >
            Scan me
          </div>
        </div>

        {/* Menu URL */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.02em",
            color: "rgba(34,31,24,0.55)",
            marginTop: 18,
            wordBreak: "break-all",
          }}
        >
          {menuUrl.replace(/^https?:\/\//, "")}
        </div>

        {/* Trust line */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: `1.5px solid ${INK}`,
          }}
        >
          {upiVpa && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: INK,
                marginBottom: 4,
              }}
            >
              {upiVpa}
            </div>
          )}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BLUE,
              fontWeight: 600,
            }}
          >
            Pay by UPI · zero commission
          </div>
        </div>
      </div>
    </div>
  );
}
