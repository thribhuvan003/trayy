import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tray — Street food, without the queue.";
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
          justifyContent: "center",
          padding: "80px",
          background: "#0d0c0a",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>Tray</div>
        <div style={{ fontSize: 52, marginTop: 16, color: "#e6e2d9", lineHeight: 1.2 }}>
          Street food, without the queue.
        </div>
        <div style={{ fontSize: 30, marginTop: 32, color: "#9a958a" }}>
          Scan the stall&apos;s QR. Pay its UPI directly. Pick up with a token.
        </div>
      </div>
    ),
    { ...size }
  );
}
