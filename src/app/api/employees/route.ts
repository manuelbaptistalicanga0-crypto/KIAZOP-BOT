import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { PLAN_LIMITS, PlanLimitError, type PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { apiError, getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+244\d{9}$/, "Usa o indicativo +244 e 9 dígitos."),
});

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const employees = await getPrisma().employee.findMany({
      where: { tenantId },
      select: { id: true, name: true, phone: true, _count: { select: { tasks: { where: { status: { not: "COMPLETED" } } } } } },
      orderBy: { name: "asc" },
    });
    return Response.json({ employees });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Indica o nome e um número no formato +244923000000." }, { status: 400 });
    const prisma = getPrisma();
    const employee = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // O lock por empresa torna a verificação de quota segura sob concorrência.
      await tx.$queryRawUnsafe('SELECT "id" FROM "Tenant" WHERE "id" = $1 FOR UPDATE', tenantId);
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
      if (!tenant) return null;
      const count = await tx.employee.count({ where: { tenantId } });
      if (count >= PLAN_LIMITS[tenant.plan as PlanTier].employees) throw new PlanLimitError("Atingiste o limite de membros do teu plano.");
      return tx.employee.create({ data: { tenantId, name: parsed.data.name, phone: parsed.data.phone.slice(1) }, select: { id: true, name: true, phone: true } });
    });
    if (!employee) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    if (error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: 403 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ error: "Este número já está na equipa." }, { status: 409 });
    return apiError(error);
  }
}
