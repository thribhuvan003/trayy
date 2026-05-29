"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MonitorSmartphone, ShoppingBag, LayoutDashboard, School } from "lucide-react";

type Link = {
  label: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  who: string;
  accentBg: string;
};

function CopyRow({ link }: { link: Link }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center gap-3 group transition-colors"
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px solid var(--admin-line)",
        background: "var(--admin-bg-card)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--admin-line-2)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--admin-line)"; }}
    >
      {/* icon */}
      <div
        className="flex shrink-0 items-center justify-center rounded-lg"
        style={{ height: 36, width: 36, background: link.accentBg }}
      >
        {link.icon}
      </div>

      {/* text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ fontSize: 13, color: "var(--admin-ink)" }}>{link.label}</span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.10em", color: "var(--admin-ink-3)" }}
          >
            {link.who}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono" style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>{link.url}</p>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={copy}
          title="Copy link"
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ height: 32, width: 32, color: "var(--admin-ink-3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--admin-bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink-3)"; }}
        >
          {copied ? <Check size={14} style={{ color: "var(--admin-mint)" }} /> : <Copy size={14} />}
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title="Open in new tab"
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ height: 32, width: 32, color: "var(--admin-ink-3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--admin-bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink-3)"; }}
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

export function CanteenLinks({
  tenantSlug,
  tenantName,
  collegeSlug,
  appUrl,
}: {
  tenantSlug: string;
  tenantName: string;
  collegeSlug?: string | null;
  appUrl: string;
}) {
  const base = appUrl.replace(/\/$/, "");

  const links: Link[] = [
    {
      label: "Student ordering",
      description: "Share with students or customers",
      url: `${base}/c/${tenantSlug}/menu`,
      icon: <ShoppingBag size={16} style={{ color: "var(--admin-sky)" }} />,
      who: "Students · Customers",
      accentBg: "rgba(92,177,255,0.14)",
    },
    {
      label: "Kitchen board",
      description: "Open on the kitchen tablet",
      url: `${base}/c/${tenantSlug}/kitchen`,
      icon: <MonitorSmartphone size={16} style={{ color: "var(--admin-rose)" }} />,
      who: "Kitchen staff",
      accentBg: "rgba(255,107,107,0.14)",
    },
    {
      label: "Admin dashboard",
      description: "Your management console",
      url: `${base}/c/${tenantSlug}/admin/dashboard`,
      icon: <LayoutDashboard size={16} style={{ color: "var(--admin-lime)" }} />,
      who: "You · Canteen admin",
      accentBg: "rgba(205,250,80,0.12)",
    },
    ...(collegeSlug
      ? [
          {
            label: "College portal",
            description: "All canteens at this institution",
            url: `${base}/college/${collegeSlug}`,
            icon: <School size={16} style={{ color: "var(--admin-violet)" }} />,
            who: "College director",
            accentBg: "rgba(167,139,250,0.14)",
          } satisfies Link,
        ]
      : []),
  ];

  return (
    <section
      className="mb-6 p-4"
      style={{
        borderRadius: 16,
        border: "1px solid var(--admin-line)",
        background: "var(--admin-bg-card)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ fontSize: 13, color: "var(--admin-ink)" }}>
            {tenantName} — Your links
          </h2>
          <p className="mt-0.5" style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
            Share the student link with your customers. Open the kitchen link on your tablet.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <CopyRow key={l.label} link={l} />
        ))}
      </div>
    </section>
  );
}
