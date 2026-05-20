"use client";

import { useState } from "react";
import { X as XIcon, CheckCircle2 } from "lucide-react";

type Link = { label: string; url: string };

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without interaction context
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 shrink-0 text-[10px] font-mono font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded border border-graphite-200/20 text-graphite-400 hover:text-lime hover:border-lime/40 transition-colors"
      aria-label={`Copy ${url}`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function LinkRow({ label, url }: Link) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-1.5 border-b border-graphite-200/8 last:border-0">
      <span className="w-36 shrink-0 text-[11px] font-mono uppercase tracking-[0.08em] text-graphite-400">
        {label}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] text-ocean-400 hover:text-ocean-300 truncate transition-colors"
      >
        {url}
      </a>
      <CopyButton url={url} />
    </div>
  );
}

export function WelcomeBanner({
  tenantSlug,
  collegeSlug,
  appUrl,
}: {
  tenantSlug: string;
  collegeSlug: string;
  appUrl: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const links: Link[] = [
    { label: "Student ordering", url: `${appUrl}/c/${tenantSlug}/menu` },
    { label: "Kitchen board", url: `${appUrl}/c/${tenantSlug}/kitchen` },
    { label: "Admin dashboard", url: `${appUrl}/c/${tenantSlug}/admin/dashboard` },
    { label: "College portal", url: `${appUrl}/college/${collegeSlug}` },
  ];

  const nextSteps = [
    "Add your UPI ID in Settings → so students can pay you directly",
    "Add your menu items in Menu Manager",
    "Share the student link or QR code with your students",
  ];

  return (
    <div className="mb-8 rounded-xl border border-lime/25 bg-lime/5 p-5 relative">
      <button
        aria-label="Dismiss welcome banner"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-graphite-400 hover:text-graphite-200 transition-colors"
      >
        <XIcon size={15} />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[22px]" aria-hidden="true">🎉</span>
        <div>
          <h2 className="text-[15px] font-semibold text-graphite-100">Your canteen is live!</h2>
          <p className="text-[12px] text-graphite-400 mt-0.5">Share these links with your team</p>
        </div>
      </div>

      <div className="mb-5">
        {links.map((l) => (
          <LinkRow key={l.label} label={l.label} url={l.url} />
        ))}
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-500 mb-2">
          Next steps
        </div>
        <ul className="flex flex-col gap-1.5">
          {nextSteps.map((step) => (
            <li key={step} className="flex items-start gap-2 text-[12px] text-graphite-300">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-lime" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
