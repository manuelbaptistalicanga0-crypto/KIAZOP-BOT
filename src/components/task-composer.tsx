"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, LoaderCircle } from "lucide-react";

type Employee = { id: string; name: string };

export function TaskComposer({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, employeeId, dueAt: new Date(dueAt).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível guardar a tarefa.");
      setTitle(""); setDueAt(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro."); }
    finally { setBusy(false); }
  }

  return <form className="task-create-form" id="nova" onSubmit={submit}>
    <div className="form-inline-title"><span className="section-icon"><Plus size={18} /></span><div><h2>Atribuir tarefa</h2><p>Define quem faz e até quando.</p></div></div>
    {employees.length === 0 ? <p className="empty-inline">Adiciona primeiro alguém à <a href="/team">equipa</a> para poderes atribuir tarefas.</p> : <div className="task-form-grid">
      <label className="field"><span>O que é preciso fazer?</span><input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={180} placeholder="Ex.: Preparar relatório de vendas" required /></label>
      <label className="field"><span>Atribuir a</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>
      <label className="field"><span>Prazo</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required /></label>
      <button className="button button-primary task-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Atribuir</button>
      {error && <p className="form-error full-row" role="alert">{error}</p>}
    </div>}
  </form>;
}
