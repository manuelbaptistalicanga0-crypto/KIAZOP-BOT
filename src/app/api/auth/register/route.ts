import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({
  company: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "O serviço ainda está a ser configurado: falta ligar a base de dados. Tenta mais tarde ou contacta o administrador." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Confere os campos; a palavra-passe deve ter pelo menos 10 caracteres." }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    const existing = await getPrisma().user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return Response.json({ error: "Este email já tem conta. Entra na tua conta." }, { status: 409 });
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await getPrisma().$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({ data: { name: parsed.data.company }, select: { id: true } });
      return tx.user.create({
        data: { tenantId: tenant.id, name: parsed.data.name, email, passwordHash },
        select: { id: true },
      });
    });
    return Response.json({ created: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Falha no registo", error);
    return Response.json({ error: "Não foi possível criar a conta. Tenta novamente." }, { status: 500 });
  }
}
