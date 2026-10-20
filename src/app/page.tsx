"use client";

import { useState } from "react";

const example = {
  object: "whatsapp_business_account",
  entry: [{
    id: "123456789",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "15550000000", phone_number_id: "987654321" },
        contacts: [{ profile: { name: "Ana" }, wa_id: "244923456789" }],
        messages: [{ from: "244923456789", id: "wamid.demo-001", timestamp: "1730000000", type: "text", text: { body: "Olá! Gostaria de marcar uma consulta." } }],
      },
    }],
  }],
};

export default function Home() {
  const [payload, setPayload] = useState(JSON.stringify(example, null, 2));
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function testWebhook() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Pedido falhou (${response.status})`);
      setResult(JSON.stringify(data, null, 2));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível testar o webhook.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">K</span> KIAZOP<span className="brand-muted">BOT</span></a><span className="status"><i /> Demo local</span></header>
      <section className="hero">
        <div className="eyebrow"><span>PLATAFORMA DE ATENDIMENTO</span><span className="eyebrow-line" /></div>
        <h1>Teste um webhook<br /><em>sem complicações.</em></h1>
        <p>Explore a normalização de mensagens do WhatsApp. Edite o payload, envie-o e veja o resultado em tempo real — sem credenciais externas.</p>
      </section>
      <section className="tester" aria-label="Testador de webhook">
        <div className="panel">
          <div className="panel-head"><div><span className="step">01</span><h2>Payload de entrada</h2></div><button className="text-button" onClick={() => setPayload(JSON.stringify(example, null, 2))}>Restaurar exemplo</button></div>
          <label className="sr-only" htmlFor="payload">Payload JSON</label>
          <textarea id="payload" spellCheck={false} value={payload} onChange={(event) => setPayload(event.target.value)} />
          <div className="panel-foot"><span>POST&nbsp; /api/webhooks/whatsapp</span><button className="run-button" onClick={testWebhook} disabled={busy}>{busy ? "A testar…" : "Executar teste"}<span aria-hidden="true">↗</span></button></div>
        </div>
        <div className="panel output-panel">
          <div className="panel-head"><div><span className="step">02</span><h2>Resultado normalizado</h2></div><span className="live-label"><i /> PRONTO</span></div>
          <div className={`output ${result || error ? "has-result" : ""}`} aria-live="polite">
            {error ? <pre className="error-text">{error}</pre> : result ? <pre>{result}</pre> : <div className="empty"><div className="empty-icon">⌁</div><strong>À espera de um payload</strong><span>Executa o teste para ver as mensagens convertidas.</span></div>}
          </div>
          <div className="panel-foot output-foot"><span>RESPOSTA JSON</span><span>Sem serviços externos</span></div>
        </div>
      </section>
      <footer><span>© KIAZOP BOT</span><span>Uma demonstração local para desenvolvimento e QA.</span><a href="/api/health" target="_blank" rel="noreferrer">Verificar API&nbsp; ↗</a></footer>
    </main>
  );
}
