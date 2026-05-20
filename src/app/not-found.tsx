import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0a0f1e",
        color: "#e8e4dc",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(232,228,220,0.38)",
            marginBottom: "16px",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "clamp(32px,6vw,52px)",
            fontWeight: 500,
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            margin: "0 0 12px",
          }}
        >
          That page{" "}
          <span style={{ fontStyle: "italic", color: "#7eb8ff" }}>
            doesn&rsquo;t exist.
          </span>
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(232,228,220,0.55)",
            margin: "0 0 32px",
          }}
        >
          The link may be broken, or the page may have moved.
        </p>
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "44px",
              padding: "0 22px",
              borderRadius: "999px",
              background: "#3b82f6",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background .15s",
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
