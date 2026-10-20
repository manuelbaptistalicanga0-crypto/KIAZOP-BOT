import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { apiError, getTenantId } from "@/lib/tenant";
import { sendTaskReminderTemplate, WhatsAppSendError } from "@/lib/whatsapp";

export const runtime = "nodejs";
const schema = z.object({ phone: z.string().trim().regex(/^\+244\d{9}$/, "Usa o formato +244923000000.") });

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Introduz um número angolano no formato +244923000000." }, { status: 400 });
    const config = await getPrisma().whatsAppConfig.findUnique({
      where: { tenantId },
      select: { tenantId: true, phoneNumberId: true, encryptedAccessToken: true, enabled: true },
    });
    if (!config?.enabled) return Response.json({ error: "Guarda primeiro a configuração WhatsApp." }, { status: 409 });
    await sendTaskReminderTemplate(getPrisma(), config, parsed.data.phone.slice(1), "ExecutaPro", "teste de ligação do WhatsApp", "agora");
    return Response.json({ sent: true, message: "Pedido enviado à Meta. Confirma a recepção no telemóvel." });
  } catch (error) {
    if (error instanceof WhatsAppSendError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    return apiError(error);
  }
}
