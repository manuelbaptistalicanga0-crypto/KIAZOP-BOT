import { z } from "zod";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
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
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    if (!tenant) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    const count = await prisma.employee.count({ where: { tenantId } });
    if (count >= PLAN_LIMITS[tenant.plan as PlanTier].employees) return Response.json({ error: "Atingiste o limite de membros do teu plano." }, { status: 403 });
    const employee = await prisma.employee.create({ data: { tenantId, name: parsed.data.name, phone: parsed.data.phone.slice(1) }, select: { id: true, name: true, phone: true } });
    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return Response.json({ error: "Este número já está na equipa." }, { status: 409 });
    return apiError(error);
  }
}
