import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { normalizeWhatsAppWebhook } from "@/lib/webhook";
import { sendWhatsAppText } from "@/lib/whatsapp";

const openStatuses = ["PENDING", "IN_PROGRESS", "DELAYED"] as const;
function command(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleUpperCase("pt-AO");
}

type Reply = { config: { tenantId: string; phoneNumberId: string; encryptedAccessToken: string }; to: string; text: string };

/** Processa num único commit as mudanças de tarefa e o ACK interno do evento. */
export async function processWebhookEvent(eventId: string): Promise<void> {
  const prisma = getPrisma();
  const claimed = await prisma.webhookEvent.updateMany({
    where: { id: eventId, status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 5 } },
    data: { status: "PROCESSING", processingAt: new Date(), attempts: { increment: 1 }, lastError: null },
  });
  if (!claimed.count) return;

  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId }, select: { id: true, tenantId: true, payload: true, attempts: true } });
  if (!event) return;
  const replies: Reply[] = [];
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const config = await tx.whatsAppConfig.findUnique({
        where: { tenantId: event.tenantId },
        select: { tenantId: true, phoneNumberId: true, encryptedAccessToken: true, enabled: true },
      });
      if (!config?.enabled) throw new Error("Configuração WhatsApp desactivada.");

      for (const message of normalizeWhatsAppWebhook(event.payload)) {
        const employee = await tx.employee.findFirst({ where: { tenantId: event.tenantId, phone: message.from }, select: { id: true, name: true, phone: true } });
        if (!employee) continue;
        const text = message.text?.trim() || "";
        const normalized = command(text);
        const waiting = await tx.task.findFirst({
          where: { tenantId: event.tenantId, employeeId: employee.id, status: "AWAITING_DELAY_REASON" },
          select: { id: true, title: true }, orderBy: { dueAt: "asc" },
        });

        if (waiting && normalized !== "ATRASO" && normalized !== "FEITO" && normalized !== "1" && text) {
          await tx.task.updateMany({
            where: { id: waiting.id, tenantId: event.tenantId, employeeId: employee.id, status: "AWAITING_DELAY_REASON" },
            data: { status: "DELAYED", delayReason: text.slice(0, 1000) },
          });
          replies.push({ config, to: employee.phone, text: `Obrigado, ${employee.name}. Registei o motivo do atraso na tarefa “${waiting.title}”.` });
          continue;
        }

        const task = waiting || await tx.task.findFirst({
          where: { tenantId: event.tenantId, employeeId: employee.id, status: { in: [...openStatuses] } },
          select: { id: true, title: true }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        });
        if (!task) {
          replies.push({ config, to: employee.phone, text: `Olá ${employee.name}. Não tens tarefas em aberto neste momento.` });
          continue;
        }
        if (normalized === "ATRASO" && waiting) {
          replies.push({ config, to: employee.phone, text: `Ainda preciso do motivo do atraso na tarefa “${task.title}”. Envia uma mensagem curta com o motivo.` });
          continue;
        }

        if (normalized === "FEITO" || normalized === "1") {
          const result = await tx.task.updateMany({
            where: { id: task.id, tenantId: event.tenantId, employeeId: employee.id, status: waiting ? "AWAITING_DELAY_REASON" : { in: [...openStatuses] } },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          const answer = result.count ? `Concluído! Registei “${task.title}” como feita. Obrigado, ${employee.name}.` : "Esta tarefa já foi actualizada. Confirma com a tua chefia.";
          replies.push({ config, to: employee.phone, text: answer });
        } else if (normalized === "ATRASO") {
          await tx.task.updateMany({ where: { id: task.id, tenantId: event.tenantId, employeeId: employee.id, status: { in: [...openStatuses] } }, data: { status: "AWAITING_DELAY_REASON" } });
          replies.push({ config, to: employee.phone, text: `Percebido. Qual é o motivo do atraso na tarefa “${task.title}”? Responde com uma mensagem curta.` });
        } else {
          replies.push({ config, to: employee.phone, text: `Olá ${employee.name}. Para actualizar “${task.title}”, responde FEITO quando terminares ou ATRASO para indicar o motivo.` });
        }
      }
      // Marcar concluído dentro da mesma transacção impede completar outra tarefa
      // se a chamada de saída à Graph API falhar depois de actualizar a primeira.
      await tx.webhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), processingAt: null } });
    });
  } catch (error) {
    const attempts = event.attempts;
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: attempts >= 5 ? "FAILED" : "PENDING", processingAt: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Erro desconhecido" },
    });
    console.error("Falha a processar webhook", { eventId: event.id, tenantId: event.tenantId, attempts, error });
    return;
  }

  // Respostas externas ficam fora da transacção para não prender uma conexão SQL.
  // Uma falha de envio não volta a executar o comando nem altera uma segunda tarefa.
  for (const reply of replies) {
    try { await sendWhatsAppText(prisma, reply.config, reply.to, reply.text); }
    catch (error) { console.error("Falha ao responder ao funcionário", { tenantId: reply.config.tenantId, to: reply.to, error }); }
  }
}
