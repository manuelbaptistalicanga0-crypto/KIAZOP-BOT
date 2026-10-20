"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";

export function EmployeeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/employees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, phone: `+244${phone.replace(/\D/g, "")}` }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível adicionar o membro.");
      setName(""); setPhone(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro."); }
    finally { setBusy(false); }
  }
  return <form className="task-create-form" onSubmit={submit}><div className="form-inline-title"><span className="section-icon"><UserPlus size={18} /></span><div><h2>Adicionar à equipa</h2><p>O número é usado para associar as respostas do WhatsApp.</p></div></div><div className="employee-form-grid"><label className="field"><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} placeholder="Ex.: Ana Manuel" required /></label><label className="field"><span>WhatsApp</span><div className="phone-input"><span>+244</span><input aria-label="Número de WhatsApp sem indicativo" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="923 000 000" minLength={9} maxLength={9} required /></div></label><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <UserPlus size={17} />} Adicionar</button>{error && <p className="form-error full-row" role="alert">{error}</p>}</div></form>;
}
