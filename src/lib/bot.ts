import { getPrisma } from "@/lib/prisma";
import { normalizeWhatsAppWebhook } from "@/lib/webhook";
import { sendWhatsAppText } from "@/lib/whatsapp";

const openStatuses = ["PENDING", "IN_PROGRESS", "DELAYED"] as const;

function command(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleUpperCase("pt-AO");
}

/** Processamento idempotente fora da resposta do webhook. O evento já está persistido. */
export async function processWebhookEvent(eventId: string): Promise<void> {
  const prisma = getPrisma();
  const claimed = await prisma.webhookEvent.updateMany({
    where: { id: eventId, status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 5 } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
  });
  if (!claimed.count) return;

  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId }, select: { id: true, tenantId: true, payload: true, attempts: true } });
  if (!event) return;
  try {
    const config = await prisma.whatsAppConfig.findUnique({
      where: { tenantId: event.tenantId },
      select: { tenantId: true, phoneNumberId: true, encryptedAccessToken: true, enabled: true },
    });
    if (!config?.enabled) throw new Error("Configuração WhatsApp desactivada.");

    for (const message of normalizeWhatsAppWebhook(event.payload)) {
      const employee = await prisma.employee.findFirst({
        where: { tenantId: event.tenantId, phone: message.from },
        select: { id: true, name: true, phone: true },
      });
      if (!employee) continue;
      const text = message.text?.trim() || "";
      const normalized = command(text);
      const waiting = await prisma.task.findFirst({
        where: { tenantId: event.tenantId, employeeId: employee.id, status: "AWAITING_DELAY_REASON" },
        select: { id: true, title: true }, orderBy: { dueAt: "asc" },
      });

      if (waiting && normalized !== "ATRASO" && normalized !== "FEITO" && normalized !== "1") {
        await prisma.task.updateMany({ where: { id: waiting.id, tenantId: event.tenantId, employeeId: employee.id, status: "AWAITING_DELAY_REASON" }, data: { status: "DELAYED", delayReason: text.slice(0, 1000) } });
        await sendWhatsAppText(prisma, config, employee.phone, `Obrigado, ${employee.name}. Registei o motivo do atraso na tarefa “${waiting.title}”.`);
        continue;
      }

      const task = waiting || await prisma.task.findFirst({
        where: { tenantId: event.tenantId, employeeId: employee.id, status: { in: [...openStatuses] } },
        select: { id: true, title: true }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      });
      if (!task) {
        await sendWhatsAppText(prisma, config, employee.phone, `Olá ${employee.name}. Não tens tarefas em aberto neste momento.`);
        continue;
      }
      if (normalized === "ATRASO" && waiting) {
        await sendWhatsAppText(prisma, config, employee.phone, `Ainda preciso do motivo do atraso na tarefa “${task.title}”. Envia uma mensagem curta com o motivo.`);
        continue;
      }

      if (normalized === "FEITO" || normalized === "1") {
        const result = await prisma.task.updateMany({
          where: { id: task.id, tenantId: event.tenantId, employeeId: employee.id, status: waiting ? "AWAITING_DELAY_REASON" : { in: [...openStatuses] } },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await sendWhatsAppText(prisma, config, employee.phone, result.count ? `Concluído! Registei “${task.title}” como feita. Obrigado, ${employee.name}.` : "Esta tarefa já foi actualizada. Confirma com a tua chefia.");
      } else if (normalized === "ATRASO") {
        await prisma.task.updateMany({ where: { id: task.id, tenantId: event.tenantId, employeeId: employee.id, status: { in: [...openStatuses] } }, data: { status: "AWAITING_DELAY_REASON" } });
        await sendWhatsAppText(prisma, config, employee.phone, `Percebido. Qual é o motivo do atraso na tarefa “${task.title}”? Responde com uma mensagem curta.`);
      } else {
        await sendWhatsAppText(prisma, config, employee.phone, `Olá ${employee.name}. Para actualizar “${task.title}”, responde FEITO quando terminares ou ATRASO para indicar o motivo.`);
      }
    }
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
  } catch (error) {
    const attempts = event.attempts + 1;
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: attempts >= 5 ? "FAILED" : "PENDING", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Erro desconhecido" },
    });
    console.error("Falha a processar webhook", { eventId: event.id, tenantId: event.tenantId, attempts, error });
  }
}
