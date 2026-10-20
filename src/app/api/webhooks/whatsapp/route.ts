import { createHash } from "node:crypto";
import { after } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hashVerifyToken, safeHashEqual } from "@/lib/crypto";
import { normalizeWhatsAppWebhook, verifyMetaSignature } from "@/lib/webhook";
import { processWebhookEvent } from "@/lib/bot";

export const runtime = "nodejs";

function phoneNumberId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return null;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || !Array.isArray((entry as { changes?: unknown }).changes)) continue;
    for (const change of (entry as { changes: unknown[] }).changes) {
      if (!change || typeof change !== "object") continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") continue;
      const metadata = (value as { metadata?: unknown }).metadata;
      if (metadata && typeof metadata === "object" && typeof (metadata as { phone_number_id?: unknown }).phone_number_id === "string") return (metadata as { phone_number_id: string }).phone_number_id;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) return new Response("Webhook verification failed", { status: 403 });
  try {
    const tokenHash = hashVerifyToken(token);
    const config = await getPrisma().whatsAppConfig.findFirst({
      where: { verifyTokenHash: tokenHash, enabled: true },
      select: { verifyTokenHash: true },
    });
    if (!config || !safeHashEqual(config.verifyTokenHash, tokenHash)) return new Response("Webhook verification failed", { status: 403 });
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch (error) {
    console.error("Falha na verificação do webhook", error);
    return new Response("Webhook temporarily unavailable", { status: 503 });
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET;
  if (process.env.NODE_ENV === "production" && !appSecret) return Response.json({ error: "Webhook signature validation is not configured" }, { status: 503 });
  if (appSecret && !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) return Response.json({ error: "Invalid webhook signature" }, { status: 401 });

  let payload: unknown;
  try { payload = JSON.parse(rawBody); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const numberId = phoneNumberId(payload);
  if (!numberId) return Response.json({ received: true, ignored: true });

  try {
    const prisma = getPrisma();
    const config = await prisma.whatsAppConfig.findUnique({ where: { phoneNumberId: numberId }, select: { tenantId: true, enabled: true } });
    if (!config?.enabled) return Response.json({ received: true, ignored: true });
    const messageIds = normalizeWhatsAppWebhook(payload).map((message) => message.id);
    const providerEventId = messageIds[0] || createHash("sha256").update(rawBody).digest("hex");
    let event;
    try {
      event = await prisma.webhookEvent.create({
        data: { tenantId: config.tenantId, providerEventId, payload: payload as never },
        select: { id: true },
      });
    } catch (error) {
      // Meta repete eventos quando não recebe 200. A chave única torna a ingestão idempotente.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ received: true, duplicate: true });
      throw error;
    }
    // O evento fica persistido antes do ACK. after() processa fora do tempo de resposta;
    // se o worker falhar, o registo fica disponível para reprocessamento protegido.
    after(async () => processWebhookEvent(event.id));
    return Response.json({ received: true });
  } catch (error) {
    console.error("Falha ao aceitar evento WhatsApp", error);
    return Response.json({ error: "Temporarily unavailable" }, { status: 503 });
  }
}
