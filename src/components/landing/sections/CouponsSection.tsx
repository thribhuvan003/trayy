import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

const CARDS = [
  {
    href: "/demo/student",
    variant: "customer" as const,
    label: "A · Customer",
    device: "Phone",
    title: "Phone in the queue",
    copy: "Scan the QR, pick items, pay the stall’s UPI, then show the token at the counter.",
    cta: "Open customer demo",
    preview: "preview-customer" as const,
    featured: true,
  },
  {
    href: "/demo/kitchen",
    variant: "kitchen" as const,
    label: "B · Kitchen · optional",
    device: "Tablet",
    title: "Only if you have staff",
    copy: "Live queue for bigger counters. Solo carts can skip this board completely.",
    cta: "Open kitchen demo",
    preview: "preview-kitchen" as const,
    featured: false,
  },
  {
    href: "/demo/admin",
    variant: "admin" as const,
    label: "C · Owner desk",
    device: "Desktop",
    title: "Today’s cash, one page",
    copy: "Orders, sold-out, QR poster, staff — your stall desk. Commission stays at zero.",
    cta: "Open admin demo",
    preview: "preview-admin" as const,
    featured: false,
  },
];

function Preview({ kind }: { kind: "preview-customer" | "preview-kitchen" | "preview-admin" }) {
  if (kind === "preview-customer") {
    return (
      <div className="lp-coupon-preview lp-coupon-preview--dark">
        <div className="lp-coupon-preview-bar">
          <span>Today&apos;s board</span>
          <span>Sample</span>
        </div>
        <div className="lp-coupon-preview-line">
          <span>Masala Dosa</span>
          <span>₹70</span>
        </div>
        <div className="lp-coupon-preview-line">
          <span>Filter Coffee</span>
          <span>₹50</span>
        </div>
        <div className="lp-coupon-preview-pay">
          <span>Pay by UPI</span>
          <span className="lp-coupon-chip">₹120 →</span>
        </div>
        <div className="lp-coupon-preview-note">Token after pay · sample only</div>
      </div>
    );
  }
  if (kind === "preview-kitchen") {
    return (
      <div className="lp-coupon-preview lp-coupon-preview--ink">
        <div className="lp-coupon-preview-bar">
          <span>Queue</span>
          <span className="lp-live-dot">● Live</span>
        </div>
        <div className="lp-coupon-ticket">
          <span>T-2425 · Biryani</span>
          <b>Ready</b>
        </div>
        <div className="lp-coupon-ticket">
          <span>T-2426 · Thali</span>
          <b className="is-new">New</b>
        </div>
      </div>
    );
  }
  return (
    <div className="lp-coupon-preview lp-coupon-preview--paper">
      <div className="lp-coupon-preview-bar is-admin">
        <span>Cash book</span>
        <span className="lp-live-dot">● Live</span>
      </div>
      <div className="lp-coupon-kpis">
        <div>
          <span>Today</span>
          <strong>Open</strong>
        </div>
        <div>
          <span>Cut</span>
          <strong className="is-zero">0%</strong>
        </div>
      </div>
      <p className="lp-coupon-preview-note">Real totals in your admin</p>
    </div>
  );
}

export function CouponsSection() {
  return (
    <Reveal id="demos" className="lp-band-demos" from="up" delayMs={0}>
      <div className="lp-demos-inner">
        <div className="lp-sec-head">
          <p className="lp-sec-kicker">01 · Try before you set up</p>
          <h2 className="lp-sec-title">Three demos · one stall day</h2>
          <p className="lp-sec-lede">
            Customer phone first. Kitchen only if you need it. Cash book for you — sample data, no
            sign-up, no real money.
          </p>
        </div>

        <div className="lp-coupons-grid lp-stagger">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`lp-coupon lp-coupon--${card.variant}${card.featured ? " is-featured" : ""}`}
            >
              <div className="lp-coupon-head">
                <span className="lp-coupon-head-label">{card.label}</span>
                <span className="lp-coupon-device">{card.device}</span>
              </div>
              <div className="lp-coupon-body">
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </div>
              <Preview kind={card.preview} />
              <div className="lp-coupon-foot">
                <span className="lp-coupon-cta">
                  {card.cta}
                  <span className="lp-coupon-cta-arrow" aria-hidden>
                    →
                  </span>
                </span>
                <span className="lp-coupon-nosign">No sign-up</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
