import { normalizeWhatsAppWebhook, verifyMetaSignature } from "@/lib/webhook";

export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode !== "subscribe" || !challenge || !expectedToken || token !== expectedToken) {
    return new Response("Webhook verification failed", { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET;

  // In production, never accept unsigned webhook requests. Local development can
  // exercise payload normalization without exposing a real Meta app secret.
  if (process.env.NODE_ENV === "production" && !appSecret) {
    return Response.json({ error: "META_APP_SECRET is required in production" }, { status: 503 });
  }
  if (appSecret && !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const messages = normalizeWhatsAppWebhook(payload);
  return Response.json({ received: true, count: messages.length, messages });
}
