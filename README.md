# PAPEL — Plataforma de Bots de Atendimento Multi-Tenant com IA

**PAPEL** é uma plataforma SaaS para automatizar atendimento em WhatsApp e Instagram DM usando IA conversacional. Construída para PMEs (clínicas, salões, imobiliárias, academias, e-commerces).

## Características Principais

- ✅ **Multi-tenant isolado**: Row Level Security (RLS) no PostgreSQL
- ✅ **IA sem guiões rígidos**: Comportamento emerge de base de factos viva + histórico real
- ✅ **Janela de 24h com templates**: Compliance com política Meta
- ✅ **Agendamento à prova de erro**: Locks distribuídos, confirmações explícitas
- ✅ **RAG integrado**: Ingestão de conhecimento, busca híbrida
- ✅ **Transferência para humano**: Detecção automática, inbox unificada
- ✅ **Compliance**: LGPD/GDPR, consentimento, minimização de dados, auditoria

## Quick Start

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+
- PostgreSQL 14+ (ou usar docker-compose)

### Instalação Local

```bash
# 1. Clone repositório
git clone https://github.com/seu-usuario/papel.git
cd papel

# 2. Setup ambiente
cp .env.example .env

# 3. Iniciar BD + Redis (docker-compose)
docker-compose up -d

# 4. Instalar dependências
npm install

# 5. Aplicar schema ao DB (Drizzle)
npx drizzle-kit push

# 6. Aplicar RLS policies
psql postgresql://postgres:postgres@127.0.0.1:5432/app_db < infra/scripts/init-db.sql

# 7. Rodar dev server
npm run dev

# Acesso:
# API: http://localhost:3000
# Admin: http://localhost:3001 (próximas fases)
```

## Arquitetura

Ver `/docs/ARCHITECTURE.md` para detalhes completos.

```
apps/
  api/        — Webhooks, REST, workers
  admin/      — Painel Next.js

packages/
  core/       — Motor de conversação (máquina de estados, LLM + tools)
  channels/   — Normalização WhatsApp/Instagram
  llm/        — Providers (Claude, fallbacks)
  rag/        — Ingestão, embeddings, busca
  scheduling/ — Agendamento, slots, reminders
  handoff/    — Transferência para humano
  compliance/ — Consentimento, audit, PII
  evals/      — Testes de conversa
```

## Roadmap

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 | ✅ **EM PROGRESSO** | Fundação: BD, webhook, normalização, 24h window |
| 2 | ⏳ Próxima | Motor de conversação: máquina de estados, LLM + tools |
| 3 | ⏳ | Agendamento à prova de erro |
| 4 | ⏳ | RAG e conhecimento |
| 5 | ⏳ | Funil, humano e painel |
| 6 | ⏳ | Compliance e segurança |
| 7 | ⏳ | Qualidade (evals) |
| 8 | ⏳ | Negócio (pricing, onboarding) |
| 9 | ⏳ | Aprendizagem contínua |

## Documentação

- 📖 [`/docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitetura completa
- 📋 [`/docs/DECISIONS.md`](docs/DECISIONS.md) — Decisões de design
- 🔧 [`/docs/RUNBOOK.md`](docs/RUNBOOK.md) — Guia de incidentes (em breve)
- 📊 [`/docs/PRICING.md`](docs/PRICING.md) — Modelos de preço (em breve)
- ✅ [`/docs/ONBOARDING-CLIENTE.md`](docs/ONBOARDING-CLIENTE.md) — Onboarding (em breve)

## Testes

```bash
# Rodar testes (Jest)
npm test

# Com cobertura
npm test -- --coverage
```

## Desenvolvendo

### Adicionar novo endpoint

1. Criar arquivo em `src/app/api/[path]/route.ts`
2. Implementar GET/POST/PUT/DELETE
3. Adicionar middleware de autenticação/tenant
4. Testar

### Adicionar nova tool para LLM

1. Criar arquivo em `packages/llm/src/tools/[name].ts`
2. Implementar interface `Tool`
3. Registar em `packages/llm/src/tools/index.ts`
4. Testar

## Segurança

- Todos os secrets em `.env` (não committar)
- RLS ativada em todas as tabelas
- Validação com Zod
- Logs estruturados (PII mascarado)
- Encriptação de tokens sensíveis

## Contribuir

Este é um projeto MVP em desenvolvimento ativo. PRs bem-vindas!

## Licença

Proprietary (em breve: escolher licença apropriada)

## Contacto

📧 team@papel.ai
🌐 https://papel.ai
