import { randomBytes } from "node:crypto";
import { z } from "zod";
import { encryptSecret, hashVerifyToken } from "@/lib/crypto";
import { getPrisma } from "@/lib/prisma";
import { apiError, getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
const schema = z.object({
  accessToken: z.string().trim().min(20).max(4096),
  phoneNumberId: z.string().trim().regex(/^\d{5,30}$/),
  wabaId: z.string().trim().regex(/^\d{5,30}$/),
});

function webhookUrl(): string {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/api/webhooks/whatsapp`;
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Token, ID do número e ID da conta WhatsApp são obrigatórios." }, { status: 400 });

    // O token de verificação aparece uma única vez. Na base de dados guardamos
    // apenas o hash; o token de acesso da Meta é guardado cifrado com AES-GCM.
    const verifyToken = randomBytes(32).toString("base64url");
    await getPrisma().whatsAppConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        phoneNumberId: parsed.data.phoneNumberId,
        wabaId: parsed.data.wabaId,
        encryptedAccessToken: encryptSecret(parsed.data.accessToken),
        verifyTokenHash: hashVerifyToken(verifyToken),
      },
      update: {
        phoneNumberId: parsed.data.phoneNumberId,
        wabaId: parsed.data.wabaId,
        encryptedAccessToken: encryptSecret(parsed.data.accessToken),
        verifyTokenHash: hashVerifyToken(verifyToken),
        enabled: true,
      },
    });
    return Response.json({ saved: true, verifyToken, webhookUrl: webhookUrl() }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "Este número WhatsApp já está ligado a outra empresa." }, { status: 409 });
    }
    return apiError(error);
  }
}
