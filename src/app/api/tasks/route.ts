import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
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
    const [tenant, employee, activeTasks] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } }),
      prisma.employee.findFirst({ where: { id: parsed.data.employeeId, tenantId }, select: { id: true } }),
      prisma.task.count({ where: { tenantId, status: { not: "COMPLETED" } } }),
    ]);
    if (!tenant) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    if (!employee) return Response.json({ error: "Escolhe um membro da tua equipa." }, { status: 400 });
    if (activeTasks >= PLAN_LIMITS[tenant.plan as PlanTier].activeTasks) return Response.json({ error: "Atingiste o limite de tarefas activas do teu plano." }, { status: 403 });
    const task = await prisma.task.create({
      data: { tenantId, employeeId: employee.id, title: parsed.data.title, dueAt: new Date(parsed.data.dueAt), description: parsed.data.description },
      select: { id: true, title: true, dueAt: true, status: true },
    });
    revalidatePath("/dashboard");
    return Response.json({ task }, { status: 201 });
  } catch (error) { return apiError(error); }
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
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}
