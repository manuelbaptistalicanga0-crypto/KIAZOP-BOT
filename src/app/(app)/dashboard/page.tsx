import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, ListTodo } from "lucide-react";
import { getTenantId } from "@/lib/tenant";
import { getPrisma } from "@/lib/prisma";
import { getDashboard } from "@/lib/dashboard";
import { TaskComposer } from "@/components/task-composer";
import { TaskBoard } from "@/components/task-board";

export const metadata: Metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const tenantId = await getTenantId();
  const [data, employees, whatsapp] = await Promise.all([
    getDashboard(tenantId),
    getPrisma().employee.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getPrisma().whatsAppConfig.findUnique({ where: { tenantId }, select: { enabled: true } }),
  ]);
  const firstName = data.tenant?.name || "a tua empresa";
  const date = new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Luanda" }).format(new Date());

  return <div className="page-wrap">
    <header className="page-header"><div><p className="page-kicker">{date}</p><h1>Bom trabalho, {firstName}.</h1><p className="page-subtitle">Aqui está o ponto de situação da tua equipa.</p></div><Link className="button button-primary" href="/tasks#nova"><ListTodo size={17} /> Atribuir tarefa</Link></header>
    {!whatsapp?.enabled && <Link className="setup-banner" href="/setup"><span className="banner-icon"><CircleAlert size={19} /></span><span><strong>Liga o WhatsApp da tua empresa</strong><small>Configura o número para começar a cobrar tarefas automaticamente.</small></span><ArrowRight size={18} /></Link>}
    <section className="metric-grid" aria-label="Resumo das tarefas">
      <Metric icon={<ListTodo size={19} />} label="Tarefas hoje" value={data.today} tone="blue" />
      <Metric icon={<CircleAlert size={19} />} label="Atrasadas" value={data.overdue} tone="orange" />
      <Metric icon={<CircleCheck size={19} />} label="Concluídas" value={data.completed} tone="green" />
    </section>
    <section className="content-section"><div className="section-heading"><div><h2>Tarefas em aberto</h2><p>As próximas tarefas atribuídas à equipa.</p></div><Link className="subtle-link" href="/tasks">Ver todas <ArrowRight size={15} /></Link></div><div className="surface"><TaskBoard tasks={data.tasks} /></div></section>
    <section className="content-section"><TaskComposer employees={employees} /></section>
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-foot">{value === 1 ? "1 tarefa" : `${value} tarefas`}</span></article>;
}
