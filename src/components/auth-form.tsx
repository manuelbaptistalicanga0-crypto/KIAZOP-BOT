"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

export function AuthForm({
  mode,
  databaseConfigured,
  googleEnabled,
}: {
  mode: "login" | "register";
  databaseConfigured: boolean;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, company, email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível criar a conta.");
      }
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (!result?.ok) {
        if (result?.error === "CredentialsSignin") throw new Error("Email ou palavra-passe incorrectos. Confere os dados ou cria uma conta.");
        throw new Error("Não foi possível entrar. Verifica a ligação do serviço e tenta novamente.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocorreu um erro. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (!databaseConfigured) return;
    if (!googleEnabled) {
      setError("A entrada Google ainda não está activa. O administrador precisa de configurar o Google OAuth na Vercel.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Não foi possível ligar à conta Google. Tenta novamente.");
      setBusy(false);
    }
  }

  return <div className="auth-card">
    <div className="auth-brand"><span className="brand-icon">E</span><span>executa<span>pro</span></span></div>
    <p className="page-kicker">GESTÃO DE EQUIPAS</p>
    <h1>{isRegister ? "Começa com a tua equipa." : "Bom ver-te de volta."}</h1>
    <p className="auth-description">{isRegister ? "Cria o espaço da tua empresa e começa a organizar o trabalho." : "Entra para veres as tarefas e acompanhares a tua equipa."}</p>

    {!databaseConfigured && <div className="auth-notice" role="status">
      <strong>O acesso está temporariamente indisponível.</strong>
      <span>Falta ligar a base de dados do ExecutaPro. Assim que o administrador concluir a configuração, poderás entrar ou criar a tua conta.</span>
    </div>}

    <button className="button button-secondary button-wide google-button" type="button" onClick={continueWithGoogle} disabled={busy || !databaseConfigured}>
      {busy ? <LoaderCircle className="spin" size={17} /> : <GoogleMark />}
      Continuar com Google
    </button>
    {databaseConfigured && !googleEnabled && <p className="auth-hint">A entrada Google será activada quando o administrador ligar as credenciais OAuth.</p>}
    {isRegister && <p className="auth-hint auth-google-note">Com Google, a conta e um espaço inicial para a tua empresa são criados automaticamente.</p>}
    <div className="auth-divider"><span>ou usa o teu email</span></div>

    <form className="auth-form" onSubmit={submit}>
      {isRegister && <>
        <label className="field"><span>Nome da empresa</span><input value={company} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" minLength={2} maxLength={100} placeholder="Ex.: Oficina Kiala" required /></label>
        <label className="field"><span>O teu nome</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} placeholder="Ex.: Ana Manuel" required /></label>
      </>}
      <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="nome@empresa.ao" required /></label>
      <label className="field"><span>Palavra-passe</span>
        <span className="password-field">
          <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 10 : 8} maxLength={128} placeholder={isRegister ? "Pelo menos 10 caracteres" : "A tua palavra-passe"} required />
          <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"} aria-pressed={showPassword}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide auth-submit" disabled={busy || !databaseConfigured}>
        {busy ? <LoaderCircle className="spin" size={17} /> : null}
        {isRegister ? "Criar conta" : "Entrar"}
        <ArrowRight size={17} />
      </button>
    </form>
    <p className="auth-switch">{isRegister ? "Já tens conta?" : "Ainda não tens conta?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Entrar" : "Criar conta"}</Link></p>
    <p className="auth-terms">Ao continuar, aceitas usar o serviço de acordo com os termos da tua empresa.</p>
  </div>;
}

function GoogleMark() {
  return <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.66 5.94c4.47-4.13 7.11-10.2 7.11-17.59Z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.67-5.94c-2.13 1.43-4.86 2.3-8.23 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
  </svg>;
}
