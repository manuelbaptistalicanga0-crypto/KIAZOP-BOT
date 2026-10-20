import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { PLAN_LIMITS, PlanLimitError, type PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { apiError, getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
const createSchema = z.object({
  title: z.string().trim().min(3).max(180),
  employeeId: z.string().min(1),
  dueAt: z.string().datetime({ offset: true }),
  description: z.string().trim().max(1000).optional(),
});
const updateSchema = z.object({ id: z.string().min(1), status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]) });

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const tasks = await getPrisma().task.findMany({
      where: { tenantId },
      select: { id: true, title: true, dueAt: true, status: true, employee: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
    });
    return Response.json({ tasks });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Preenche o título, a pessoa responsável e o prazo." }, { status: 400 });
    const prisma = getPrisma();
    const employee = await prisma.employee.findFirst({ where: { id: parsed.data.employeeId, tenantId }, select: { id: true } });
    if (!employee) return Response.json({ error: "Escolhe um membro da tua equipa." }, { status: 400 });
    const task = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Serializa as criações desta empresa para não ultrapassar a quota em pedidos concorrentes.
      await tx.$queryRawUnsafe('SELECT "id" FROM "Tenant" WHERE "id" = $1 FOR UPDATE', tenantId);
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
      if (!tenant) return null;
      const activeTasks = await tx.task.count({ where: { tenantId, status: { not: "COMPLETED" } } });
      if (activeTasks >= PLAN_LIMITS[tenant.plan as PlanTier].activeTasks) throw new PlanLimitError("Atingiste o limite de tarefas activas do teu plano.");
      return tx.task.create({
        data: { tenantId, employeeId: employee.id, title: parsed.data.title, dueAt: new Date(parsed.data.dueAt), description: parsed.data.description },
        select: { id: true, title: true, dueAt: true, status: true },
      });
    });
    if (!task) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    revalidatePath("/dashboard");
    revalidateTag(`dashboard-${tenantId}`, "max");
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: 403 });
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await getTenantId();
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Actualização de tarefa inválida." }, { status: 400 });
    const result = await getPrisma().task.updateMany({
      where: { id: parsed.data.id, tenantId },
      data: { status: parsed.data.status, completedAt: parsed.data.status === "COMPLETED" ? new Date() : null },
    });
    if (!result.count) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    revalidatePath("/dashboard");
    revalidateTag(`dashboard-${tenantId}`, "max");
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}
