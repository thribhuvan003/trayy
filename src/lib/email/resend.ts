import "server-only";
import { env, featureFlags } from "@/lib/env";

type SendArgs = { to: string; subject: string; html: string; from?: string };

export async function sendEmail(args: SendArgs) {
  if (!featureFlags.resendLive) {
    console.log("[email:noop]", { to: args.to, subject: args.subject });
    return { id: "noop", queued: false };
  }
  const from = args.from ?? env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is required when transactional email is enabled");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id, queued: true };
}
