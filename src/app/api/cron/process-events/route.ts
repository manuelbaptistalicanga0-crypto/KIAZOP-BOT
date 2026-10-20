import { getPrisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron-auth";
import { processWebhookEvent } from "@/lib/bot";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  // Recupera leases de funções serverless que foram terminadas no meio do trabalho.
  await prisma.webhookEvent.updateMany({
    where: { status: "PROCESSING", processingAt: { lt: new Date(Date.now() - 2 * 60_000) } },
    data: { status: "PENDING", processingAt: null, lastError: "Lease de processamento expirou; evento reencaminhado." },
  });
  const events = await prisma.webhookEvent.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 5 } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  await Promise.all(events.map((event: { id: string }) => processWebhookEvent(event.id)));
  return Response.json({ accepted: true, processed: events.length });
}
