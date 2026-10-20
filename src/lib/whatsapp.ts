import type { PrismaClient } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

const currentMonthStart = () => {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

type Config = { tenantId: string; phoneNumberId: string; encryptedAccessToken: string };

export class WhatsAppSendError extends Error {
  constructor(message: string) { super(message); this.name = "WhatsAppSendError"; }
}
type Outgoing = { type: "text"; text: { body: string; preview_url: boolean } } | { type: "template"; template: { name: string; language: { code: string }; components?: Array<{ type: string; parameters: Array<{ type: "text"; text: string }> }> } };

async function send(prisma: PrismaClient, config: Config, recipient: string, message: Outgoing): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: config.tenantId }, select: { plan: true } });
  if (!tenant) throw new WhatsAppSendError("Empresa não encontrada.");
  const limit = PLAN_LIMITS[tenant.plan as PlanTier].monthlyMessages;
  const sentThisMonth = await prisma.messageLog.count({
    where: { tenantId: config.tenantId, status: "SENT", direction: "OUTBOUND", createdAt: { gte: currentMonthStart() } },
  });
  if (sentThisMonth >= limit) throw new WhatsAppSendError("A empresa atingiu o limite mensal de mensagens do seu plano.");

  const token = decryptSecret(config.encryptedAccessToken);
  const version = process.env.META_GRAPH_API_VERSION || "v23.0";
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: recipient, ...message }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    await prisma.messageLog.create({ data: { tenantId: config.tenantId, direction: "OUTBOUND", status: "FAILED", to: recipient, kind: message.type } });
    throw new WhatsAppSendError("Não foi possível ligar à Meta. Confirma a ligação e tenta novamente.");
  }
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  await prisma.messageLog.create({
    data: { tenantId: config.tenantId, direction: "OUTBOUND", status: response.ok ? "SENT" : "FAILED", to: recipient, kind: message.type },
  });
  if (!response.ok) throw new WhatsAppSendError(body.error?.message || `Meta Graph API respondeu ${response.status}.`);
}

export async function sendWhatsAppText(prisma: PrismaClient, config: Config, recipient: string, text: string): Promise<void> {
  await send(prisma, config, recipient, { type: "text", text: { body: text, preview_url: false } });
}

/** Envia apenas template previamente aprovado e publicado na conta Meta. */
export async function sendTaskReminderTemplate(prisma: PrismaClient, config: Config, recipient: string, name: string, task: string, time: string): Promise<void> {
  const templateName = process.env.META_TASK_TEMPLATE_NAME;
  if (!templateName) throw new WhatsAppSendError("META_TASK_TEMPLATE_NAME não configurado.");
  await send(prisma, config, recipient, {
    type: "template",
    template: {
      name: templateName,
      language: { code: process.env.META_TEMPLATE_LANGUAGE || "pt_PT" },
      components: [{ type: "body", parameters: [name, task, time].map((text) => ({ type: "text" as const, text })) }],
    },
  });
}
