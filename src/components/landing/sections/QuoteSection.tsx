import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

/**
 * Close = decision, not another trust restatement.
 */
export function QuoteSection() {
  return (
    <Reveal className="lp-band-close">
      <div className="lp-close">
        <div className="lp-close-mark" aria-hidden>
          <span className="lp-close-zero">10</span>
          <span className="lp-close-cut">min</span>
        </div>

        <div className="lp-close-copy">
          <p className="lp-close-eyebrow">Last stop</p>
          <h2 className="lp-close-title">
            QR on the cart
            <br />
            before the next rush.
          </h2>
          <p className="lp-close-lede">
            Set up the stall, print the poster, take the first phone order. Demos first if you want
            to feel it — no account required.
          </p>
          <div className="lp-close-actions">
            <Link href="/get-started" className="lp-close-cta">
              Set up my stall
            </Link>
            <Link href="/demo/student" className="lp-close-link">
              Or try the customer demo first
            </Link>
          </div>
        </div>

        <ul className="lp-close-facts">
          <li>
            <span>You need</span>
            <strong>A phone + a UPI ID</strong>
          </li>
          <li>
            <span>You skip</span>
            <strong>App install wars at the counter</strong>
          </li>
          <li>
            <span>You keep</span>
            <strong>Every rupee on the plate</strong>
          </li>
        </ul>
      </div>
    </Reveal>
  );
}