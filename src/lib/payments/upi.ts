export function upiQrPayload(opts: { vpa: string; name: string; amountPaise: number; note?: string }) {
  const pa = encodeURIComponent(opts.vpa.trim());
  const pn = encodeURIComponent(opts.name.trim()).replace(/\+/g, "%20");
  const am = (opts.amountPaise / 100).toFixed(2);
  const cu = "INR";
  
  let url = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}`;
  if (opts.note) {
    // Clean notes: alphanumeric, dashes, and spaces only, max 20 chars for standard UPI limit
    const cleanNote = opts.note.replace(/[^a-zA-Z0-9- ]/g, "").slice(0, 20);
    url += `&tn=${encodeURIComponent(cleanNote).replace(/\+/g, "%20")}`;
  }
  return url;
}

