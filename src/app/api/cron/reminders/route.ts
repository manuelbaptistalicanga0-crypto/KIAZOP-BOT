import { getPrisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron-auth";
import { sendTaskReminderTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const now = new Date();
  const fiveMinutes = new Date(now.getTime() + 5 * 60_000);
  const tasks = await prisma.task.findMany({
    where: { dueAt: { gte: now, lte: fiveMinutes }, reminderSentAt: null, status: { in: ["PENDING", "IN_PROGRESS"] } },
    select: {
      id: true, tenantId: true, title: true, dueAt: true,
      employee: { select: { name: true, phone: true } },
      tenant: { select: { whatsappConfig: { select: { tenantId: true, phoneNumberId: true, encryptedAccessToken: true, enabled: true } } } },
    },
    orderBy: { dueAt: "asc" },
    take: 100,
  });
  let sent = 0;
  for (const task of tasks) {
    const config = task.tenant.whatsappConfig;
    if (!config?.enabled) continue;
    try {
      const time = new Intl.DateTimeFormat("pt-AO", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Luanda" }).format(task.dueAt);
      await sendTaskReminderTemplate(prisma, config, task.employee.phone, task.employee.name, task.title, time);
      await prisma.task.updateMany({ where: { id: task.id, tenantId: task.tenantId, reminderSentAt: null }, data: { reminderSentAt: now } });
      sent += 1;
    } catch (error) {
      console.error("Falha no lembrete da tarefa", { tenantId: task.tenantId, taskId: task.id, error });
    }
  }
  return Response.json({ accepted: true, checked: tasks.length, sent });
}
