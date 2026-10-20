import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";
import { TaskComposer } from "@/components/task-composer";
import { TaskBoard } from "@/components/task-board";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage() {
  const tenantId = await getTenantId();
  const [tasks, employees] = await Promise.all([
    getPrisma().task.findMany({
      where: { tenantId, status: { not: "COMPLETED" } },
      select: { id: true, title: true, dueAt: true, status: true, employee: { select: { id: true, name: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    getPrisma().employee.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <div className="page-wrap">
    <header className="page-header"><div><p className="page-kicker">ORGANIZAÇÃO</p><h1>Tarefas</h1><p className="page-subtitle">Atribui, acompanha e conclui o trabalho da equipa.</p></div></header>
    <section className="content-section"><TaskComposer employees={employees} /></section>
    <section className="content-section"><div className="section-heading"><div><h2>Em aberto</h2><p>{tasks.length} {tasks.length === 1 ? "tarefa por concluir" : "tarefas por concluir"}</p></div></div><div className="surface"><TaskBoard tasks={tasks} /></div></section>
  </div>;
}
