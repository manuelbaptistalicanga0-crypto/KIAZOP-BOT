"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Circle, Clock3, LoaderCircle } from "lucide-react";

type Task = { id: string; title: string; dueAt: Date | string; status: string; employee: { name: string } };
const statusText: Record<string, string> = { PENDING: "Por começar", IN_PROGRESS: "Em curso", AWAITING_DELAY_REASON: "A aguardar motivo", DELAYED: "Atrasada" };
const formatDeadline = (date: Date | string) => new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Luanda" }).format(new Date(date));

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function finish(id: string) {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: "COMPLETED" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir a tarefa.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro."); }
    finally { setBusy(null); }
  }

  if (!tasks.length) return <div className="empty-state"><span className="empty-illustration"><Check size={24} /></span><strong>Está tudo em dia.</strong><p>Quando atribuíres tarefas, vais acompanhá-las aqui.</p></div>;
  return <div className="task-list">
    {error && <p className="form-error" role="alert">{error}</p>}
    {tasks.map((task) => {
      const overdue = new Date(task.dueAt).getTime() < Date.now();
      return <article className="task-row" key={task.id}>
        <button className="task-check" type="button" aria-label={`Concluir ${task.title}`} disabled={busy === task.id} onClick={() => finish(task.id)}>{busy === task.id ? <LoaderCircle className="spin" size={19} /> : <Circle size={20} />}</button>
        <div className="task-main"><strong>{task.title}</strong><span>{task.employee.name}</span></div>
        <span className={`task-status ${overdue ? "status-late" : ""}`}><i />{overdue ? "Atrasada" : statusText[task.status] || task.status}</span>
        <span className="task-deadline"><Clock3 size={14} />{formatDeadline(task.dueAt)}</span>
      </article>;
    })}
  </div>;
}
