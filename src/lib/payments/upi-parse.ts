// Words that mean "money left the account" — if present, this is NOT a credit.
const DEBIT_WORDS = /\b(sent|paid|debited|debit|request(ed)?)\b/i;

// Matches ₹ / Rs / Rs. / INR followed by a number with optional thousands
// separators and optional .paise. Captures the numeric part.
const AMOUNT_RE = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

/**
 * Parse the credited rupee amount (in paise) from a UPI app notification.
 * Returns null if the text is a debit/sent/request notification or has no amount.
 */
export function parseUpiCreditPaise(text: string): number | null {
  if (!text) return null;
  if (DEBIT_WORDS.test(text)) return null;

  const m = AMOUNT_RE.exec(text);
  if (!m) return null;

  const numeric = m[1].replace(/,/g, "");
  const rupees = Number.parseFloat(numeric);
  if (!Number.isFinite(rupees)) return null;

  // Round to nearest paise to avoid float drift (e.g. 50.43 → 5043).
  return Math.round(rupees * 100);
}
