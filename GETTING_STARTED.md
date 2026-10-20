# Getting Started — PAPEL Plataforma de Bots Multi-Tenant

Bem-vindo! Este documento guia os passos para começar a trabalhar com PAPEL.

## 0️⃣ Antes de Começar

### Requisitos
- **Node.js:** 20+ (verificar com `node --version`)
- **Docker + Docker Compose:** Para PostgreSQL e Redis
- **PostgreSQL CLI (psql):** Para scripts SQL (opcional mas recomendado)
- **Git:** Para versionamento

### Verificar Instalação
```bash
node --version    # v20.x.x
docker --version
docker-compose --version
```

---

## 1️⃣ Setup Local (5 minutos)

### Passo 1: Clonar Repositório
```bash
git clone https://github.com/seu-usuario/papel.git
cd papel
```

### Passo 2: Configurar Ambiente
```bash
cp .env.example .env
# Revisar .env (padrões funcionam para local dev)
```

### Passo 3: Iniciar Infraestrutura (Docker)
```bash
docker-compose up -d

# Verificar se subiu bem:
docker-compose ps
# Deve mostrar: postgres (healthy), redis (healthy)
```

### Passo 4: Instalar Dependências Node
```bash
npm install
```

### Passo 5: Aplicar Schema ao BD (Drizzle)
```bash
npx drizzle-kit push

# Confirmar: "Applied X migrations"
```

### Passo 6: Aplicar RLS Policies
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db < infra/scripts/init-db.sql

# Confirmar: nenhum erro, output com "CREATE EXTENSION"
```

### Passo 7: Seed Demo Data (Opcional)
```bash
npx ts-node infra/scripts/seed-demo.ts

# Output: "✨ Seed de demo data concluído!"
```

### Passo 8: Iniciar Dev Server
```bash
npm run dev

# Output:
# - ready - started server on http://localhost:3000, url: http://localhost:3000
# - event - compiled client and server successfully
```

✅ **Pronto!** Aplicação rodando em http://localhost:3000

---

## 2️⃣ Verificar Setup

### Health Check
```bash
curl http://localhost:3000/api/health
# Resposta: {"status":"ok"}
```

### Webhook Verification
```bash
curl -X GET "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=demo-verify-token-yyy&hub.challenge=test123"
# Resposta: test123 (challenge value)
```

### BD Connected
```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT COUNT(*) FROM tenants;"
# Se seed rodou: 1 (demo tenant)
```

---

## 3️⃣ Estrutura do Projeto

```
PAPEL/
├── src/                    # App principal (Next.js)
│   ├── db/
│   │   ├── schema.ts       ← 18 tabelas PostgreSQL
│   │   └── index.ts        ← Drizzle client
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/      ← Health check
│   │   │   └── webhooks/    ← Webhook handlers
│   │   ├── page.tsx         ← Landing page
│   │   └── layout.tsx
│   ├── utils/              ← Helpers
│   │   ├── logger.ts        ← Pino logger
│   │   ├── env.ts           ← Config validation
│   │   ├── webhook-verification.ts
│   │   ├── message-normalizer.ts
│   │   └── message-window.ts
│   ├── types/
│   │   └── index.ts         ← Core types
│   └── tests/
│       ├── webhook-verification.test.ts
│       └── message-normalizer.test.ts
│
├── apps/                   # Futuros (Fase 2+)
│   ├── api/                ← API separada (opcional)
│   └── admin/              ← Painel admin (Fase 5)
│
├── packages/               ← Shared code (Fases 2+)
│   ├── core/               ← Motor de conversação
│   ├── channels/           ← WhatsApp/Instagram
│   ├── llm/                ← LLM providers
│   ├── rag/                ← Conhecimento
│   ├── scheduling/         ← Agendamento
│   ├── handoff/            ← Transferência humano
│   ├── compliance/         ← LGPD/GDPR
│   └── evals/              ← Testes
│
├── templates/              ← Nichos
│   └── niches/
│       ├── clinica-dentaria/
│       ├── salao/
│       ├── imobiliaria/
│       ├── academia/
│       └── ecommerce/
│
├── infra/
│   ├── docker-compose.yml
│   ├── scripts/
│   │   ├── init-db.sql     ← RLS policies
│   │   └── seed-demo.ts    ← Demo data
│   └── .env.example
│
├── docs/
│   ├── ARCHITECTURE.md      ← Visão geral
│   ├── DECISIONS.md         ← Decisões
│   ├── PHASE1_SUMMARY.md    ← Fase 1 completa
│   ├── ROADMAP.md           ← Plano futuro
│   └── README.md
│
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## 4️⃣ Comandos Úteis

### Desenvolvimento
```bash
npm run dev              # Start dev server com hot reload
npm run build            # Build production
npm start                # Start production server
npm run typecheck        # Check TypeScript (sem build)
npm run lint             # ESLint
```

### Testes
```bash
npm test                 # Jest (uma vez)
npm run test:watch      # Jest watch mode
npm run test:coverage   # Cobertura
```

### Database
```bash
npx drizzle-kit push    # Aplicar schema
npx drizzle-kit pull    # Pull schema atual
npx drizzle-kit studio  # Drizzle UI (browser)
```

### Troubleshooting
```bash
# Verificar BD
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db

# Listar tabelas
\dt

# Ver schema de tabela
\d tenants

# Contar rows
SELECT COUNT(*) FROM tenants;

# Ver logs Docker
docker-compose logs -f postgres
docker-compose logs -f redis
```

---

## 5️⃣ Próximos Passos

### Desenvolvedor (Fase 2)
1. Lê `/docs/ROADMAP.md` — seção **FASE 2**
2. Cria `packages/core/src/state-machine.ts`
3. Integra Claude (Anthropic API)
4. Cria tools para LLM
5. Escreve 50+ testes de conversa
6. → Submete PR com testes passando

### Product Manager
1. Lê `/docs/PRICING.md` e `/docs/ONBOARDING-CLIENTE.md` (serão criados em Fase 8)
2. Define requirements para Fase 5 (painel admin)
3. Prioriza features por ROI

### Sales
1. Lê `/docs/ARCHITECTURE.md` — seção "Características Principais"
2. Prepara pitch para PMEs
3. Define nicho prioritário

---

## 6️⃣ Arquitetura Overview (5 min read)

**PAPEL** é multi-tenant isolado via RLS PostgreSQL:

```
Cliente envia msg WhatsApp
    ↓
Webhook POST /api/webhooks/whatsapp
    ↓
Verificar assinatura + tenant lookup
    ↓
Normalizar para formato interno
    ↓
Criar/lookup contacto, conversa
    ↓
Inserir mensagem em BD
    ↓
Responder 200 (imediato)
    ↓
[Assíncrono] Worker processa em BullMQ
    ↓
Carrega memória + histórico + facts
    ↓
Máquina de estados → LLM decision
    ↓
Tool calling (buscar conhecimento, agendar, etc)
    ↓
Formatar resposta → enviar via WhatsApp
```

**Cada tenant é isolado** via:
- RLS PostgreSQL (row-level security)
- `tenant_id` em cada query
- Middleware de contexto

**Dados principais:**
- `tenants` — clientes da plataforma
- `channels` — conexões WhatsApp/Instagram
- `contacts` — clientes dos clientes
- `conversations` — chats
- `messages` — mensagens normalizadas
- `appointments` — agendamentos
- ...18 tabelas total

Ver `/docs/ARCHITECTURE.md` para detalhes.

---

## 7️⃣ Exemplo: Adicionar Novo Endpoint

Supõe que queres adicionar `GET /api/contacts/:id` para listar contactos.

### Passo 1: Criar arquivo
`src/app/api/contacts/[id]/route.ts`

### Passo 2: Implementar
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contactId = parseInt(params.id);
  const tenantId = 1; // TODO: Extract from auth/header

  const contact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1)
    .then(rows => rows[0]);

  if (!contact || contact.tenantId !== tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}
```

### Passo 3: Testar
```bash
curl http://localhost:3000/api/contacts/1
# JSON response
```

### Passo 4: Commit
```bash
git add src/app/api/contacts/[id]/route.ts
git commit -m "feat: Add GET /api/contacts/:id endpoint"
```

---

## 8️⃣ Segurança — Checklist

Antes de deployar para produção:

- ✅ Secrets em `.env` (não em código)
- ✅ RLS policies ativadas (verificar init-db.sql)
- ✅ HTTPS obrigatório (nginx/load balancer)
- ✅ Rate limiting em webhooks
- ✅ Validação com Zod em todos inputs
- ✅ PII mascarado em logs
- ✅ Tokens de API encriptados em repouso
- ✅ CORS configurado (whitelist)
- ✅ SQL injection impossível (Drizzle parameterized)
- ✅ Testes passando (npm test)

---

## 9️⃣ Monitoring & Logs

### Logs Estruturados (Pino)
```bash
# Dev (pretty-print)
tail -f your-logs | jq .

# Prod (JSON)
{"level":30,"time":"...","tenant_id":1,"message":"..."}
```

### Health Check (Prometheus-ready)
```bash
curl http://localhost:3000/api/health
```

### Database Metrics
```sql
-- Conversas por tenant
SELECT tenant_id, COUNT(*) FROM conversations GROUP BY tenant_id;

-- Mensagens hoje
SELECT COUNT(*) FROM messages WHERE DATE(created_at) = TODAY();
```

---

## 🔟 FAQ

**P: Preciso do Docker?**  
R: Sim, para PostgreSQL + Redis. Ou usar serviços cloud (RDS, ElastiCache).

**P: Posso usar outro LLM?**  
R: Sim! Criar novo provider em `packages/llm/src/` (Fase 2).

**P: Como adicionar novo nicho?**  
R: Copiar `templates/niches/clinica-dentaria/` para novo nicho, adaptar prompts.

**P: Quanto custa rodar?**  
R: Estimar: $0.05 por conversa (API Meta + Claude). Ver `/docs/PRICING.md`.

**P: Quando sairá Fase 2?**  
R: Planeado para fim da semana. Ver `/docs/ROADMAP.md`.

---

## 🔗 Links Importantes

- **Documentação:** `/docs/ARCHITECTURE.md`
- **Decisões:** `/docs/DECISIONS.md`
- **Roadmap:** `/docs/ROADMAP.md`
- **Fase 1 Resumo:** `/docs/PHASE1_SUMMARY.md`
- **Código:** `src/` (Fase 1), `packages/` (Fases 2+)

---

## ✅ Checklist de Setup

- [ ] Docker Compose subiu (postgres, redis)
- [ ] npm install completo
- [ ] Drizzle schema pushed
- [ ] RLS policies aplicadas
- [ ] npm test passa (13 testes)
- [ ] npm run build passa
- [ ] Health check OK (200)
- [ ] Webhook verification OK (challenge)
- [ ] Demo data seeded (opcional)
- [ ] Consegues abrir http://localhost:3000

Se tudo passar: **Pronto para desenvolver Fase 2!** 🚀

---

**Suporte:** team@papel.ai | Issues: GitHub Issues | Discussões: GitHub Discussions
