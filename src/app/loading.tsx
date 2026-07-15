export default function Loading() {
  return (
    <div className="lp-boot" role="status" aria-label="Loading Tray">
      <div className="lp-boot-inner">
        <div className="lp-boot-mark">
          <span className="lp-boot-word">tray</span>
          <span className="lp-boot-slash" aria-hidden>
            /
          </span>
          <span className="lp-boot-edition">street</span>
        </div>
        <div className="lp-boot-track" aria-hidden>
          <span className="lp-boot-bar" />
        </div>
        <span className="lp-boot-sub">Opening the counter…</span>
      </div>
      <style>{`
        .lp-boot {
          min-height: 100dvh;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #141210;
          color: #f7f0e4;
          padding: 24px;
          box-sizing: border-box;
        }
        .lp-boot-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          width: min(280px, 86vw);
        }
        .lp-boot-mark {
          display: flex;
          align-items: baseline;
          gap: 8px;
          line-height: 1;
        }
        .lp-boot-word {
          font-family: system-ui, "Segoe UI", sans-serif;
          font-size: clamp(40px, 12vw, 52px);
          font-weight: 800;
          letter-spacing: -0.05em;
          text-transform: lowercase;
        }
        .lp-boot-slash {
          font-size: 22px;
          opacity: 0.35;
          font-weight: 400;
        }
        .lp-boot-edition {
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #e8c860;
        }
        .lp-boot-track {
          width: 100%;
          height: 3px;
          background: rgba(244, 241, 234, 0.12);
          overflow: hidden;
          border-radius: 2px;
        }
        .lp-boot-bar {
          display: block;
          height: 100%;
          width: 40%;
          background: #c43c2c;
          border-radius: 2px;
          animation: lpBootSlide 0.9s ease-in-out infinite alternate;
        }
        .lp-boot-sub {
          font-family: system-ui, "Segoe UI", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(244, 241, 234, 0.55);
        }
        @keyframes lpBootSlide {
          from { transform: translateX(0); }
          to { transform: translateX(150%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-boot-bar {
            animation: none;
            width: 100%;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
