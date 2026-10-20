# 🧪 QA Test Plan — FASE 1

> **Plano de QA legado, não válido para o checkout atual.** Os comandos abaixo referem-se a módulos/infraestrutura de uma fase anterior. Para validar o MVP actual, usa os scripts no [README](README.md) e o workflow GitHub Actions.

## Objectivo
Validar que FASE 1 está funcional, seguro e pronto para produção.

---

## 📋 Pre-requisites

- [ ] Docker + Docker Compose instalado
- [ ] Node.js 20+ instalado
- [ ] PostgreSQL CLI (psql) instalado
- [ ] Postman ou cURL disponível
- [ ] Acesso ao repositório

---

## ✅ Test Suite 1: Setup e Infraestrutura

### T1.1 — Docker Infrastructure

**Teste:** Iniciar docker-compose
```bash
docker-compose down -v  # Limpar
docker-compose up -d
sleep 5
docker-compose ps
```

**Validar:**
- [ ] postgres: UP, healthy
- [ ] redis: UP, healthy

**Resultado:** ✅ PASS / ❌ FAIL

---

### T1.2 — Database Connection

**Teste:** Conectar à BD
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT 1"
```

**Validar:**
- [ ] Sem erro "connection refused"
- [ ] Output: "1"

**Resultado:** ✅ PASS / ❌ FAIL

---

### T1.3 — Redis Connection

**Teste:** Testar Redis
```bash
redis-cli ping
```

**Validar:**
- [ ] Output: "PONG"

**Resultado:** ✅ PASS / ❌ FAIL

---

### T1.4 — Schema Application

**Teste:** Aplicar schema Drizzle
```bash
npm install
npx drizzle-kit push
```

**Validar:**
- [ ] Sem erro
- [ ] 18 tabelas criadas
- [ ] Enums criados

**Verificar:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "\dt"
# Deve listar: tenants, channels, contacts, conversations, messages, etc (18 total)
```

**Resultado:** ✅ PASS / ❌ FAIL

---

### T1.5 — RLS Policies Application

**Teste:** Aplicar RLS
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db < infra/scripts/init-db.sql
```

**Validar:**
- [ ] Sem erro
- [ ] 18 policies criadas

**Verificar:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT COUNT(*) FROM pg_policies;"
# Deve ser 18
```

**Resultado:** ✅ PASS / ❌ FAIL

---

### T1.6 — Seed Demo Data

**Teste:** Popular BD com dados demo
```bash
npx ts-node infra/scripts/seed-demo.ts
```

**Validar:**
- [ ] Sem erro
- [ ] Output: "✨ Seed de demo data concluído!"

**Verificar:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT COUNT(*) FROM tenants;"
# Deve ser 1
```

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 2: TypeScript e Build

### T2.1 — Type Generation

**Teste:** Gerar tipos Next.js
```bash
npx next typegen
```

**Validar:**
- [ ] Output: "✓ Types generated successfully"
- [ ] Sem erro

**Resultado:** ✅ PASS / ❌ FAIL

---

### T2.2 — TypeScript Compilation

**Teste:** Type check
```bash
npx tsc --noEmit
```

**Validar:**
- [ ] Sem erro
- [ ] Sem warnings

**Resultado:** ✅ PASS / ❌ FAIL

---

### T2.3 — Production Build

**Teste:** Build otimizado
```bash
npm run build
```

**Validar:**
- [ ] Output: "✓ Compiled successfully"
- [ ] Sem erro

**Verificar:**
```bash
ls -la .next/
# Deve existir: .next/static/, etc
```

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 3: Unit Tests

### T3.1 — Webhook Verification Tests

**Teste:** Rodar testes
```bash
npm test -- src/tests/webhook-verification.test.ts
```

**Validar:**
- [ ] 8 testes passam
- [ ] Sem falhas

**Testes específicos:**
- [ ] Valid signature verification
- [ ] Invalid signature rejection
- [ ] Timing-safe comparison
- [ ] Tenant ID extraction from header
- [ ] Tenant ID extraction from phone_id
- [ ] Tenant ID extraction from Instagram
- [ ] Header priority over phone_id
- [ ] Undefined handling

**Resultado:** ✅ PASS / ❌ FAIL

---

### T3.2 — Message Normalizer Tests

**Teste:** Rodar testes
```bash
npm test -- src/tests/message-normalizer.test.ts
```

**Validar:**
- [ ] 5 testes passam
- [ ] Sem falhas

**Testes específicos:**
- [ ] WhatsApp text normalization
- [ ] WhatsApp image normalization
- [ ] Empty payload handling
- [ ] Instagram text normalization
- [ ] Instagram image attachment

**Resultado:** ✅ PASS / ❌ FAIL

---

### T3.3 — All Tests

**Teste:** Rodar suite completa
```bash
npm test
```

**Validar:**
- [ ] 13/13 testes passam
- [ ] 0 falhas

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 4: API Endpoints

### T4.1 — Health Check

**Teste:** GET /api/health
```bash
npm run dev &
sleep 3
curl http://localhost:3000/api/health
```

**Validar:**
- [ ] Status code: 200
- [ ] Response: {"status":"ok"}

**Resultado:** ✅ PASS / ❌ FAIL

---

### T4.2 — Webhook GET (Challenge)

**Teste:** Webhook verification challenge
```bash
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=demo-verify-token-yyy&hub.challenge=test123456"
```

**Validar:**
- [ ] Status code: 200
- [ ] Response body: test123456 (echo challenge)

**Resultado:** ✅ PASS / ❌ FAIL

---

### T4.3 — Webhook POST (Inbound)

**Teste:** Webhook inbound message (com assinatura válida)

```bash
# Gerar payload
PAYLOAD='{"entry":[{"changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"5585999999999","phone_number_id":"102204123456789"},"contacts":[{"profile":{"name":"John"},"wa_id":"5585988888888"}],"messages":[{"from":"5585988888888","id":"wamid.test","timestamp":"'$(date +%s)'","type":"text","text":{"body":"Olá"}}]}}]}]}'

# Gerar assinatura
SECRET="demo-webhook-secret-12345"
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

# Enviar
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

**Validar:**
- [ ] Status code: 200
- [ ] Response: {"success":true}

**Verificar no DB:**
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT COUNT(*) FROM messages;"
# Deve ter incrementado (message processada)
```

**Resultado:** ✅ PASS / ❌ FAIL

---

### T4.4 — Webhook POST (Invalid Signature)

**Teste:** Webhook com assinatura inválida
```bash
PAYLOAD='{"entry":[{"changes":[{"value":{"messaging_product":"whatsapp"}}]}]}'

curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "X-Hub-Signature-256: sha256=invalidsignaturehash" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

**Validar:**
- [ ] Status code: 401
- [ ] Response: {"error":"Invalid signature"}

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 5: Database Isolation (RLS)

### T5.1 — Tenant 1 Data Visibility

**Teste:** Verificar isolamento RLS
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "
  SELECT set_tenant_context(1);
  SELECT COUNT(*) FROM contacts;
  -- Deve retornar 1 (demo contact)
"
```

**Validar:**
- [ ] Output: 1 (only this tenant's data)

**Resultado:** ✅ PASS / ❌ FAIL

---

### T5.2 — Tenant 2 Data Isolation

**Teste:** Simular acesso de outro tenant
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "
  SELECT set_tenant_context(999);
  SELECT COUNT(*) FROM contacts;
  -- Deve retornar 0 (sem acesso a dados de outros)
"
```

**Validar:**
- [ ] Output: 0 (isolated from other tenant)

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 6: Message Normalization

### T6.1 — WhatsApp Text Message

**Teste:** Normalizar mensagem de texto
```bash
# Verificar que msg foi inserida em DB com type='text'
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "
  SELECT type, content FROM messages WHERE type='text' LIMIT 1;
"
```

**Validar:**
- [ ] type: "text"
- [ ] content has "text" field

**Resultado:** ✅ PASS / ❌ FAIL

---

### T6.2 — 24h Window Tracking

**Teste:** Verificar last_message_at atualizado
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "
  SELECT last_message_at FROM contacts WHERE id=1;
"
```

**Validar:**
- [ ] last_message_at é recente (< 1 minuto atrás)

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 7: Logging

### T7.1 — Structured Logs

**Teste:** Verificar formato de logs
```bash
# Rodar dev e capturar logs
npm run dev 2>&1 | head -20
```

**Validar:**
- [ ] Logs incluem timestamps
- [ ] Logs incluem módulos (e.g., "webhook.whatsapp")
- [ ] Logs sem `undefined` ou `[object Object]`

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 8: Security

### T8.1 — Secret Not Exposed

**Teste:** Verificar que secrets não estão em código
```bash
grep -r "sk-ant-" src/ docs/
# Deve retornar: (nada, ou apenas em .env.example)

grep -r "webhook-secret" src/ docs/
# Pode estar em comments, mas não em código executável
```

**Validar:**
- [ ] Nenhum secret em hardcode em `src/`
- [ ] `.env` não está em git

**Resultado:** ✅ PASS / ❌ FAIL

---

### T8.2 — Timing-Safe Comparison

**Teste:** Verificar segurança de comparação
```bash
# Ver test para timing-safe
npm test -- src/tests/webhook-verification.test.ts --testNamePattern="timing"
```

**Validar:**
- [ ] Teste "timing attack" passa
- [ ] Comparação é constant-time

**Resultado:** ✅ PASS / ❌ FAIL

---

### T8.3 — No SQL Injection

**Teste:** Verificar que queries usam Drizzle (não SQL string)
```bash
grep -r "SELECT \|INSERT \|UPDATE " src/app/
# Deve retornar: (nada ou apenas em init-db.sql)

grep -r "db.raw\|sql\`" src/app/
# Deve ser minimal e seguro
```

**Validar:**
- [ ] Não há SQL strings em app code
- [ ] Drizzle ORM usado exclusivamente

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 9: Documentation

### T9.1 — Documentation Exists

**Teste:** Verificar ficheiros de doc
```bash
ls -la docs/ GETTING_STARTED.md README.md QUICK_REFERENCE.md
```

**Validar:**
- [ ] ARCHITECTURE.md existe
- [ ] DECISIONS.md existe
- [ ] PHASE1_SUMMARY.md existe
- [ ] ROADMAP.md existe
- [ ] README.md existe
- [ ] GETTING_STARTED.md existe
- [ ] QUICK_REFERENCE.md existe

**Resultado:** ✅ PASS / ❌ FAIL

---

### T9.2 — Documentation Quality

**Teste:** Verificar qualidade
```bash
wc -w docs/*.md README.md GETTING_STARTED.md QUICK_REFERENCE.md
# Total deve ser > 40000 palavras
```

**Validar:**
- [ ] > 40000 palavras total
- [ ] Sem (TBD) placeholders essenciais
- [ ] Links ativos

**Resultado:** ✅ PASS / ❌ FAIL

---

## ✅ Test Suite 10: End-to-End

### T10.1 — Full Setup Scenario

**Teste:** Executar setup completo do zero
```bash
# 1. Clean
docker-compose down -v
rm -rf node_modules .next

# 2. Setup
npm install
docker-compose up -d
sleep 5

# 3. Database
npx drizzle-kit push
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db < infra/scripts/init-db.sql
npx ts-node infra/scripts/seed-demo.ts

# 4. Validate
npm test
npm run build
npm start &
sleep 3
curl http://localhost:3000/api/health
```

**Validar:**
- [ ] Todos os passos sem erro
- [ ] Health check retorna 200

**Resultado:** ✅ PASS / ❌ FAIL

---

## 📊 Summary

| Test Suite | Tests | Status |
|-----------|-------|--------|
| 1. Infrastructure | 6 | ✅ PASS / ❌ FAIL |
| 2. Build | 3 | ✅ PASS / ❌ FAIL |
| 3. Unit Tests | 13 | ✅ PASS / ❌ FAIL |
| 4. API | 4 | ✅ PASS / ❌ FAIL |
| 5. RLS Isolation | 2 | ✅ PASS / ❌ FAIL |
| 6. Normalization | 2 | ✅ PASS / ❌ FAIL |
| 7. Logging | 1 | ✅ PASS / ❌ FAIL |
| 8. Security | 3 | ✅ PASS / ❌ FAIL |
| 9. Documentation | 2 | ✅ PASS / ❌ FAIL |
| 10. E2E | 1 | ✅ PASS / ❌ FAIL |
| **TOTAL** | **37** | **✅ PASS / ❌ FAIL** |

---

## ✅ Final Approval

**Tester:** _______________  
**Date:** _______________  
**Approved for Production:** ☐ YES / ☐ NO  
**Comments:** _________________________________

---

**Status:** ✅ PRONTO PARA FASE 2
