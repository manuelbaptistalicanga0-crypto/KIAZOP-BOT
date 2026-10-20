"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleHelp, Copy, ExternalLink, LoaderCircle, ShieldCheck, Smartphone, Webhook } from "lucide-react";

const META_GUIDE = "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/";
type SetupResult = { verifyToken: string; webhookUrl: string };

export function SetupWizard({ configured, phoneNumberId: existingPhoneNumberId }: { configured: boolean; phoneNumberId?: string }) {
  const [step, setStep] = useState(configured ? 3 : 1);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  async function saveConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/setup/whatsapp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessToken, phoneNumberId, wabaId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível guardar a configuração.");
      setResult(data); setAccessToken(""); setStep(2);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro."); }
    finally { setBusy(false); }
  }

  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); window.setTimeout(() => setCopied(""), 1800); }
    catch { setError("Não foi possível copiar automaticamente. Selecciona e copia o texto."); }
  }

  async function sendTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const number = `+244${phone.replace(/\D/g, "")}`;
    setLogs((current) => [`${new Date().toLocaleTimeString("pt-AO")} · A contactar a Meta…`, ...current]);
    try {
      const response = await fetch("/api/setup/whatsapp/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: number }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A Meta não aceitou a mensagem.");
      setLogs((current) => [`${new Date().toLocaleTimeString("pt-AO")} · ${data.message}`, ...current]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Ocorreu um erro.";
      setLogs((current) => [`${new Date().toLocaleTimeString("pt-AO")} · Falha: ${message}`, ...current]);
    } finally { setBusy(false); }
  }

  return <div className="setup-layout">
    <div className="setup-intro"><span className="setup-icon"><Smartphone size={22} /></span><p className="page-kicker">CONFIGURAÇÃO INICIAL</p><h1>WhatsApp da empresa</h1><p>Segue estes passos para ligar o teu número. As credenciais ficam cifradas e associadas apenas à tua empresa.</p><div className="secure-note"><ShieldCheck size={17} /><span>Ligação segura · nunca mostramos o teu token depois de guardar</span></div></div>
    <section className="setup-card">
      <div className="progress-header"><span>PASSO {step} DE 3</span><span>{step === 1 ? "Credenciais" : step === 2 ? "Webhook" : "Teste final"}</span></div>
      <div className="progress-track"><span style={{ width: `${step * 33.333}%` }} /></div>
      <div className="step-indicators">{[1, 2, 3].map((number) => <div className={`step-indicator ${step >= number ? "step-active" : ""}`} key={number}><span>{step > number ? <Check size={14} /> : number}</span><small>{["Credenciais", "Webhook", "Teste"][number - 1]}</small></div>)}</div>

      {step === 1 && <form className="wizard-form" onSubmit={saveConfig}>
        <div className="wizard-title"><h2>Dados da Meta</h2><p>Encontras estes dados em WhatsApp → Configuração da API no Meta for Developers.</p></div>
        <label className="field"><span>Token de acesso permanente <Hint text="No painel Meta, gera um token de acesso permanente para a conta de serviço. Não uses o token temporário de teste." /></span><input type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="EAAB…" autoComplete="off" minLength={20} required /></label>
        <label className="field"><span>ID do número de telefone <Hint text="É o identificador do número dentro da Cloud API, não o número +244 que os clientes marcam." /></span><input inputMode="numeric" value={phoneNumberId} onChange={(event) => setPhoneNumberId(event.target.value.replace(/\D/g, ""))} placeholder="Ex.: 104567890123456" required /></label>
        <label className="field"><span>ID da conta WhatsApp (WABA) <Hint text="O WhatsApp Business Account ID aparece na mesma página de configuração da API." /></span><input inputMode="numeric" value={wabaId} onChange={(event) => setWabaId(event.target.value.replace(/\D/g, ""))} placeholder="Ex.: 102345678901234" required /></label>
        <a className="guide-link" href={META_GUIDE} target="_blank" rel="noreferrer">Abrir guia oficial Meta <ExternalLink size={14} /></a>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null} Guardar e continuar <ArrowRight size={17} /></button>
        <p className="wizard-footnote">O token é enviado directamente ao servidor e guardado cifrado. Nunca aparece nos registos do browser.</p>
      </form>}

      {step === 2 && result && <div className="wizard-form">
        <div className="wizard-title"><h2>Regista o webhook na Meta</h2><p>Copia estes dados para a área de Webhooks no teu painel Meta. O token de verificação só é apresentado agora.</p></div>
        <CopyField label="URL de callback" value={result.webhookUrl} copied={copied === "url"} onCopy={() => copy("url", result.webhookUrl)} />
        <CopyField label="Token de verificação" value={result.verifyToken} copied={copied === "token"} onCopy={() => copy("token", result.verifyToken)} secret />
        <div className="instruction-box"><Webhook size={18} /><div><strong>Na Meta, subscreve o campo “messages”</strong><p>Escolhe o produto WhatsApp, cola a URL e o token acima, valida e activa a subscrição do campo <code>messages</code>.</p></div></div>
        <a className="guide-link" href={META_GUIDE} target="_blank" rel="noreferrer">Como configurar na Meta <ExternalLink size={14} /></a>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="wizard-actions"><button className="button button-secondary" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Voltar</button><button className="button button-primary" type="button" onClick={() => setStep(3)}>Já configurei <ArrowRight size={16} /></button></div>
      </div>}

      {step === 3 && <div className="wizard-form">
        <div className="wizard-title"><h2>{configured ? "WhatsApp ligado" : "Envia uma mensagem de teste"}</h2><p>{configured ? `Número ligado à Cloud API · ID ${existingPhoneNumberId}. Podes confirmar a ligação ou actualizar as credenciais.` : "Introduz o teu número angolano. Enviamos o template aprovado pela Meta para confirmares a ligação."}</p></div>
        {configured && <button className="text-back update-credentials" type="button" onClick={() => setStep(1)}>Actualizar credenciais</button>}
        <form className="test-message-form" onSubmit={sendTest}><label className="field"><span>Número de destino</span><div className="phone-input"><span>+244</span><input aria-label="Número de destino sem indicativo" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="923 000 000" minLength={9} maxLength={9} required /></div></label><button className="button button-primary button-wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Smartphone size={17} />} Enviar mensagem de teste</button></form>
        <div className="live-log"><div className="log-heading"><span className="log-dot" /> LOG DE ENVIO <span>EM TEMPO REAL</span></div>{logs.length ? logs.map((line, index) => <p className={line.includes("Falha") ? "log-failed" : ""} key={`${line}-${index}`}>{line}</p>) : <p className="log-placeholder">As actualizações aparecem aqui quando testares.</p>}</div>
        <p className="wizard-footnote">O template tem de estar aprovado na Meta. Configura <code>META_TASK_TEMPLATE_NAME</code> com o nome exacto do template.</p>
        <button className="text-back" type="button" onClick={() => setStep(2)}><ArrowLeft size={15} /> Voltar às instruções do webhook</button>
      </div>}
    </section>
  </div>;
}

function Hint({ text }: { text: string }) {
  return <span className="hint-wrap"><CircleHelp size={14} aria-label="Ajuda" /><span className="hint-popover">{text}</span></span>;
}

function CopyField({ label, value, copied, onCopy, secret = false }: { label: string; value: string; copied: boolean; onCopy: () => void; secret?: boolean }) {
  return <div className="copy-field"><span>{label}</span><div><code className={secret ? "secret-code" : ""}>{value}</code><button type="button" onClick={onCopy} aria-label={`Copiar ${label}`}>{copied ? <CheckCircle2 size={17} /> : <Copy size={16} />}{copied && <small>Copiado</small>}</button></div></div>;
}
