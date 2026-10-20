"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (isRegister) {
        const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, company, email, password }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível criar a conta.");
      }
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (!result?.ok) throw new Error("Email ou palavra-passe incorrectos.");
      router.push("/dashboard"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro. Tenta novamente."); }
    finally { setBusy(false); }
  }

  return <div className="auth-card">
    <div className="auth-brand"><span className="brand-icon">E</span><span>executa<span>pro</span></span></div>
    <p className="page-kicker">GESTÃO DE EQUIPAS</p>
    <h1>{isRegister ? "Começa com a tua equipa." : "Bom ver-te de volta."}</h1>
    <p className="auth-description">{isRegister ? "Cria o espaço da tua empresa e começa a organizar o trabalho." : "Entra para veres as tarefas e acompanhares a tua equipa."}</p>
    <form className="auth-form" onSubmit={submit}>
      {isRegister && <><label className="field"><span>Nome da empresa</span><input value={company} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" minLength={2} maxLength={100} placeholder="Ex.: Oficina Kiala" required /></label><label className="field"><span>O teu nome</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} placeholder="Ex.: Ana Manuel" required /></label></>}
      <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="nome@empresa.ao" required /></label>
      <label className="field"><span>Palavra-passe</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 10 : 8} maxLength={128} placeholder={isRegister ? "Pelo menos 10 caracteres" : "A tua palavra-passe"} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{isRegister ? "Criar conta" : "Entrar"}<ArrowRight size={17} /></button>
    </form>
    <p className="auth-switch">{isRegister ? "Já tens conta?" : "Ainda não tens conta?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Entrar" : "Criar conta"}</Link></p>
    <p className="auth-terms">Ao continuar, aceitas usar o serviço de acordo com os termos da tua empresa.</p>
  </div>;
}
