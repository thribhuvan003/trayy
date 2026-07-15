import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tray — Zero cut. Their UPI. Your token.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#fdf8f0",
          color: "#1a1410",
          border: "12px solid #1a1410",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#d52821",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              fontStyle: "italic",
              borderRadius: 12,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>TRAY</div>
          <div
            style={{
              marginLeft: 12,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#1b6b3a",
              border: "2px solid #1b6b3a",
              padding: "6px 12px",
            }}
          >
            Street edition
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            Zero cut. Their UPI.
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: "#d52821" }}>
            Your token.
          </div>
          <div style={{ fontSize: 28, marginTop: 12, color: "#3d342c", maxWidth: 900, lineHeight: 1.35 }}>
            Scan the stall QR · pay their UPI · pick up with a token. Kitchen phone for the cook. Aaj ka paisa for the owner.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 20,
            fontWeight: 600,
            color: "#6b5f54",
          }}
        >
          <div>Next.js · Supabase · UPI · Real-time kitchen</div>
          <div
            style={{
              border: "3px solid #e8b84a",
              color: "#e8b84a",
              background: "#1c1916",
              padding: "10px 18px",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 4,
              transform: "rotate(-3deg)",
            }}
          >
            TRAY
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
