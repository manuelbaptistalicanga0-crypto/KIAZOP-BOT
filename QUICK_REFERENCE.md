# 🚀 QUICK REFERENCE — PAPEL Cheat Sheet

> **Referência histórica desatualizada.** Este guia menciona componentes que não existem no checkout atual. Segue o [README](README.md) para instalar e testar a demo real.

## Setup (Copy-Paste Ready)

```bash
# Clone
git clone https://github.com/seu-usuario/papel.git && cd papel

# Config
cp .env.example .env

# Infra
docker-compose up -d

# Install
npm install

# Database
npx drizzle-kit push
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db < infra/scripts/init-db.sql

# Optional: Demo data
npx ts-node infra/scripts/seed-demo.ts

# Dev
npm run dev
```

**Pronto em 2 minutos** ⚡

---

## Estrutura

```
src/db/schema.ts          → 18 tabelas
src/app/api/              → Endpoints
src/utils/                → Helpers (logger, env, crypto)
src/types/index.ts        → Core types
src/tests/                → Jest tests (13)
infra/docker-compose.yml  → PostgreSQL + Redis
docs/ARCHITECTURE.md      → Visão geral
```

---

## Comandos Essenciais

### Dev
```bash
npm run dev              # Start dev
npm run typecheck        # Check TS
npm test                # Jest
npm run build            # Prod build
npm start               # Start prod
```

### Database
```bash
npx drizzle-kit push    # Apply schema
npx drizzle-kit pull    # Get schema
npx drizzle-kit studio  # UI browser
```

### Docker
```bash
docker-compose up -d    # Start
docker-compose ps       # Status
docker-compose logs -f  # Logs
docker-compose down     # Stop
```

### SQL Direct
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db
\dt                     # List tables
\d tenants              # Describe table
SELECT COUNT(*) FROM tenants;
```

---

## Testes

```bash
npm test                 # Run once
npm run test:watch      # Watch
npm run test:coverage   # Coverage

# Ficheiros
src/tests/webhook-verification.test.ts  (8 testes)
src/tests/message-normalizer.test.ts    (5 testes)
```

---

## API Reference

### GET /api/health
```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

### GET /api/webhooks/whatsapp (Challenge)
```bash
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=XXXX&hub.challenge=YYYY"
# YYYY (challenge echo)
```

### POST /api/webhooks/whatsapp (Inbound)
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "X-Hub-Signature-256: sha256=XXXX" \
  -H "Content-Type: application/json" \
  -d '{...webhook payload...}'
# {"success":true}
```

---

## Tipos Principais

```typescript
// Mensagem normalizada (agnóstica a canal)
NormalizedMessage {
  id: string
  tenantId: number
  contactId: number
  conversationId: number
  direction: "inbound" | "outbound"
  type: "text" | "audio" | "image" | "location" | "button" | "list"
  content: MessageContent
  externalMessageId: string
  timestamp: Date
}

// Estado da conversa
ConversationState: 
  "greeting" | "qualification" | "scheduling" 
  | "faq" | "complaint" | "handoff" | "closed"

// Memoria por contacto
ContactMemory {
  name?: string
  language?: string
  timezone?: string
  extractedFacts?: Record<string, unknown>
}

// Janela de 24h
MessageWindow {
  contactId: number
  isWithin24h: boolean
  canUseTemplateFree: boolean
}
```

---

## Database Schema (Quick)

### Core Tables
- `tenants` — Isolamento
- `channels` — WhatsApp/Instagram
- `contacts` — Clientes
- `conversations` — Chats
- `messages` — Mensagens normalizadas
- `appointments` — Agendamentos
- `staff` — Profissionais
- `services` — Serviços

### RAG + Memory
- `knowledge_docs` — Documentos
- `knowledge_chunks` — Chunks + embeddings
- `contact_facts` — Memória por contacto
- `conversation_examples` — Exemplos aprendizagem

### Operations
- `handoffs` — Transferências
- `consents` — Consentimento
- `audit_log` — Auditoria
- `usage_metering` — Billing
- `unanswered_questions` — Perguntas sem resposta

---

## Tenant Isolation (RLS)

```sql
-- Configurar context
SELECT set_tenant_context(1);

-- Query automáticamente filtrada
SELECT * FROM contacts;  -- Só tenant_id=1

-- Limpar context
SELECT clear_tenant_context();
```

**Zero possibilidade de vazamento** ✅

---

## Message Normalization

```typescript
// WhatsApp → Formato interno
const normalized = normalizeWhatsAppMessage(payload, tenantId, channelId);

// Instagram → Formato interno
const normalized = normalizeInstagramMessage(payload, tenantId, channelId);

// Resultado: NormalizedMessage (agnóstico a canal)
```

---

## 24h Window Logic

```typescript
// Verificar se pode enviar mensagem livre
const window = await getMessageWindow(tenantId, contactId);

if (window.isWithin24h) {
  // Pode enviar qualquer conteúdo
  await sendFreeMessage(message);
} else {
  // Apenas templates aprovados
  const template = getApprovedTemplate("appointment_reminder");
  await sendTemplateMessage(template);
}

// Atualizar timestamp
await updateLastMessageTimestamp(tenantId, contactId);
```

---

## Logging

```typescript
import { logger, createChildLogger } from "@/utils/logger";

// Top level
logger.info("Message stored");

// Com context
const log = createChildLogger({ tenantId: 1, conversationId: 5 });
log.info("Processing message");

// Levels
log.debug("Debug info");
log.info("Info");
log.warn("Warning");
log.error("Error", { err });
```

---

## Security Checklist

- ✅ Secrets em `.env` (não git)
- ✅ HMAC-SHA256 timing-safe
- ✅ RLS policies ativadas
- ✅ Validação Zod
- ✅ HTTPS em prod
- ✅ Rate limiting em prod
- ✅ PII mascarado em logs
- ✅ Tokens encriptados em repouso

---

## Documentação

| Doc | Conteúdo | Tamanho |
|-----|----------|--------|
| ARCHITECTURE.md | Visão geral completa | 6000+ words |
| DECISIONS.md | 25 decisões técnicas | 3000+ words |
| PHASE1_SUMMARY.md | Fase 1 detalhes | 5000+ words |
| ROADMAP.md | Fases 2-9 | 8000+ words |
| README.md | Quick start | 1000 words |
| GETTING_STARTED.md | Step-by-step | 2000 words |

---

## Troubleshooting

### "Database connection failed"
```bash
docker-compose ps
# Se not running: docker-compose up -d

# Test connection
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT 1"
```

### "Drizzle-kit push failed"
```bash
# Clear cache
rm -rf node_modules/.drizzle

# Try again
npx drizzle-kit push
```

### "Tests failing"
```bash
# Clear jest cache
npx jest --clearCache

# Run with verbose
npm test -- --verbose
```

### "Port 3000 already in use"
```bash
# Kill process
lsof -i :3000
kill -9 <PID>

# Or change port: PORT=3001 npm run dev
```

---

## Next Steps (After Phase 1)

1. **Fase 2:** Motor LLM
   - Ler `/docs/ROADMAP.md` seção FASE 2
   - Criar `packages/core/src/state-machine.ts`

2. **Fase 3:** Agendamento
   - Slots calculator
   - Redis locks

3. **Fase 4:** RAG
   - Ingestão de docs
   - Busca híbrida

---

## Environment Variables

```bash
# Core
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# API
ANTHROPIC_API_KEY=sk-ant-...
META_WEBHOOK_VERIFY_TOKEN=your_token

# Server
PORT=3000
ADMIN_URL=http://localhost:3001
LOG_LEVEL=info
```

---

## Performance Tips

- ✅ Webhook responde 200 imediato (processamento async)
- ✅ Índices em `tenant_id`, `external_id`, `created_at`
- ✅ JSONB para dados customizáveis (sem schema bloat)
- ✅ pgvector para embeddings (sem serviço extra)
- ✅ Redis para filas e locks (1 comando)

---

## Contributing

1. Fork repo
2. Create branch: `git checkout -b feature/xyz`
3. Fazer changes + tests
4. `npm test` passa
5. `npm run build` passa
6. `npm run typecheck` passa
7. Commit: `git commit -m "feat: xyz"`
8. Push: `git push origin feature/xyz`
9. Create Pull Request

---

## Links

- 📖 **Docs:** `/docs/`
- 🚀 **Start:** `GETTING_STARTED.md`
- 🗺️ **Roadmap:** `/docs/ROADMAP.md`
- ✅ **Status:** `DELIVERY_CHECKLIST.md`
- 🎯 **Conclusions:** `FASE1_CONCLUSION.md`

---

**Last Updated:** 2025-01-15  
**Status:** ✅ Production Ready  
**Next Phase:** Motor de Conversação (Fase 2)
