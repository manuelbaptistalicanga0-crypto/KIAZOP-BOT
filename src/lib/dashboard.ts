import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

function luandaDayBounds(now: Date): { start: Date; end: Date; dateKey: string } {
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  // Angola está em UTC+1 e não usa horário de Verão.
  const start = new Date(`${dateKey}T00:00:00+01:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000), dateKey };
}

const cachedDashboard = unstable_cache(
  async (tenantId: string, startIso: string, endIso: string) => {
    const prisma = getPrisma();
    const start = new Date(startIso);
    const end = new Date(endIso);
    const [today, overdue, completed, tasks, tenant] = await Promise.all([
      prisma.task.count({ where: { tenantId, dueAt: { gte: start, lt: end }, status: { not: "COMPLETED" } } }),
      prisma.task.count({ where: { tenantId, dueAt: { lt: start }, status: { not: "COMPLETED" } } }),
      prisma.task.count({ where: { tenantId, completedAt: { gte: start, lt: end }, status: "COMPLETED" } }),
      prisma.task.findMany({
        where: { tenantId, status: { not: "COMPLETED" } },
        select: { id: true, title: true, dueAt: true, status: true, employee: { select: { name: true } } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, plan: true } }),
    ]);
    return { today, overdue, completed, tasks, tenant };
  },
  ["executapro-dashboard-v1"],
  { revalidate: 30, tags: ["dashboard"] },
);

export async function getDashboard(tenantId: string) {
  const { start, end } = luandaDayBounds(new Date());
  return cachedDashboard(tenantId, start.toISOString(), end.toISOString());
}
