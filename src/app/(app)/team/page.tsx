import type { Metadata } from "next";
import { Phone, Users2 } from "lucide-react";
import { EmployeeForm } from "@/components/employee-form";
import { getPrisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";

export const metadata: Metadata = { title: "Equipa" };

export default async function TeamPage() {
  const tenantId = await getTenantId();
  const employees: Array<{ id: string; name: string; phone: string; _count: { tasks: number } }> = await getPrisma().employee.findMany({
    where: { tenantId },
    select: { id: true, name: true, phone: true, _count: { select: { tasks: { where: { status: { not: "COMPLETED" } } } } } },
    orderBy: { name: "asc" },
  });
  return <div className="page-wrap">
    <header className="page-header"><div><p className="page-kicker">PESSOAS</p><h1>A tua equipa</h1><p className="page-subtitle">Cada pessoa recebe as tarefas e responde pelo WhatsApp.</p></div><span className="count-pill"><Users2 size={16} /> {employees.length} {employees.length === 1 ? "membro" : "membros"}</span></header>
    <section className="content-section"><EmployeeForm /></section>
    <section className="content-section"><div className="section-heading"><div><h2>Membros da equipa</h2><p>Os números devem ter WhatsApp activo.</p></div></div><div className="surface employee-list">
      {employees.length ? employees.map((employee) => <article className="employee-row" key={employee.id}><span className="employee-avatar">{employee.name.slice(0, 1).toUpperCase()}</span><div className="employee-copy"><strong>{employee.name}</strong><span><Phone size={13} /> +{employee.phone}</span></div><span className="task-count-pill">{employee._count.tasks} em aberto</span></article>) : <div className="empty-state"><span className="empty-illustration"><Users2 size={24} /></span><strong>A tua equipa começa aqui.</strong><p>Adiciona a primeira pessoa para poderes atribuir tarefas.</p></div>}
    </div></section>
  </div>;
}
