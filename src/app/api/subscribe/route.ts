import { NextRequest, NextResponse } from "next/server";
import { isDisposableEmail } from "disposable-email-domains-js";
import { currentOffer } from "@/lib/server/offer";
import { offerEmail } from "@/lib/server/offerEmail";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Adds an email to the Atlaso mailing list in Brevo (any popup or form can use this).
 * If an offer is running, its code is emailed to that address; the code is never sent
 * back to the browser, so only someone with a working inbox gets it.
 *
 * Server-only env: BREVO_API_KEY (Contacts + transactional email), BREVO_LIST_ID, and
 * optionally BREVO_SENDER_EMAIL / BREVO_SENDER_NAME. The key is only ever read here, on
 * the server. Without a key (local dev) nothing is sent; the signup is logged instead.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Light spam guards, per server instance: tries per IP, and code emails per address
// (anyone can type any address, so this stops the form being used to flood an inbox).
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 8;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const ipHits = new Map<string, { n: number; start: number }>();
const emailedAt = new Map<string, number>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = ipHits.get(ip);
  if (!h || now - h.start > IP_WINDOW_MS) {
    if (ipHits.size > 5000) ipHits.clear();
    ipHits.set(ip, { n: 1, start: now });
    return false;
  }
  h.n += 1;
  return h.n > IP_MAX;
}

function recentlyEmailed(email: string): boolean {
  const at = emailedAt.get(email);
  return at !== undefined && Date.now() - at < EMAIL_WINDOW_MS;
}

const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

async function brevo(path: string, body: unknown): Promise<boolean> {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.ok) return true;
  // Log Brevo's error code only, never the request (it carries the key in a header).
  const err = (await res.json().catch(() => null)) as { code?: string } | null;
  console.error(`[subscribe] Brevo ${path} failed:`, res.status, err?.code ?? "");
  return false;
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a field real visitors never see or fill.
  if (typeof body.website === "string" && body.website) {
    return NextResponse.json({ ok: true, emailed: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  // Throwaway inboxes (mailinator, 10minutemail, ...), from the community-maintained list.
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use your own email address, not a temporary inbox." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }

  const configured = Boolean(process.env.BREVO_API_KEY?.trim());
  const listId = Number(process.env.BREVO_LIST_ID);
  const offer = currentOffer();

  if (!configured) {
    console.info("[subscribe] Brevo not configured; would add", mask(email), offer ? `and email ${offer.code}` : "");
    return NextResponse.json({ ok: true, emailed: Boolean(offer) });
  }

  // updateEnabled: someone already on Brevo (e.g. a customer) is just added to the list.
  if (listId && !(await brevo("/contacts", { email, listIds: [listId], updateEnabled: true }))) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  if (!offer) return NextResponse.json({ ok: true, emailed: false });

  if (recentlyEmailed(email)) {
    // Already sent within the hour: don't send again, just point them at their inbox.
    return NextResponse.json({ ok: true, emailed: true });
  }

  const { subject, html, text } = offerEmail(offer, SITE_URL);
  const sent = await brevo("/smtp/email", {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL?.trim() || "support@myatlaso.com",
      name: process.env.BREVO_SENDER_NAME?.trim() || "Atlaso",
    },
    to: [{ email }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: ["offer"],
  });
  if (!sent) {
    return NextResponse.json({ error: "We couldn't send your code. Please check the address and try again." }, { status: 502 });
  }
  if (emailedAt.size > 20000) emailedAt.clear();
  emailedAt.set(email, Date.now());
  return NextResponse.json({ ok: true, emailed: true }, { headers: { "Cache-Control": "no-store" } });
}
