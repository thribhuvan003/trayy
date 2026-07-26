# Security policy

Tray handles real money (UPI payments) and PII (student emails, order history). We take security reports seriously.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report privately via [GitHub Security Advisories](https://github.com/thribhuvan003/trayy/security/advisories/new). Include:

- A description of the issue and its impact
- Steps to reproduce (or a proof of concept)
- The affected versions / commits / routes
- Your name and how you'd like to be credited (optional)

You should receive an acknowledgement within **72 hours**. We aim to triage and respond with a remediation plan within **7 days**.

## Scope

In scope:

- The deployed Tray application (`trayy.vercel.app` and its Vercel preview URLs)
- This repository's source code, CI configuration, and infrastructure as code
- Supabase RLS policies and database functions in `supabase/migrations/`
- Razorpay webhook handling and order capture flow

Out of scope:

- Third-party services (Supabase, Razorpay, Upstash, Resend, Vercel) — please report to them directly
- Denial-of-service via volumetric attacks
- Social engineering of Tray staff or canteen operators
- Findings from automated scanners without a demonstrated impact

## Disclosure

We follow coordinated disclosure. Once a fix is shipped and verified in production, we'll publish an advisory and credit you (if you wish). Please don't disclose publicly before the fix is live.

## Hall of fame

Researchers who responsibly disclose will be acknowledged here.
