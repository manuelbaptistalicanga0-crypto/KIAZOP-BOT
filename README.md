# ExecutaPro

SaaS mobile-first para empresas em Angola organizarem tarefas, atribuírem trabalho à equipa e acompanharem a conclusão pelo WhatsApp oficial (Meta Cloud API). Interface em português de Angola e datas no fuso `Africa/Luanda`.

[![CI](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions/workflows/ci.yml/badge.svg)](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions/workflows/ci.yml)

## O que já funciona

- **Contas e empresas separadas:** registo cria tenant; NextAuth emite sessão assinada e `getTenantId()` obtém o tenant da sessão — nunca do JSON enviado pelo browser.
- **Tarefas e equipa:** atribuição por pessoa, prazos, conclusão manual ou por WhatsApp.
- **Bot WhatsApp:** `FEITO` ou `1` conclui a próxima tarefa aberta; `ATRASO` pergunta o motivo e a próxima resposta fica registada. O número do remetente tem de estar registado na equipa.
- **Onboarding em 3 passos** em `/setup`: credenciais Meta, URL e token de webhook e envio de mensagem de teste.
- **Planos e quotas:** Free (5 pessoas, 100 tarefas activas, 500 mensagens/mês), Pro (50, 2.000, 20.000) e Enterprise (sem limite fixo). A cobrança de subscrições/pagamentos ainda não está ligada.
- **Performance:** páginas do produto são React Server Components; os componentes client são apenas formulários/feedback interactivo. Dashboard faz queries `select`ivas, cache por tenant durante 30 s e índices para tarefas, prazos e mensagens.
- **Segurança:** token de acesso Meta cifrado com AES-256-GCM, verify token guardado como hash, assinatura HMAC validada em produção, limites de tenant nas queries e chave estrangeira composta tarefa–funcionário.

## Stack

Next.js 16 App Router · React 19 · Prisma 7 com adapter `pg` · PostgreSQL/Supabase · NextAuth · Vitest · Vercel.

> O checkout original continha apenas uma demo de webhook. Esta versão acrescenta o MVP funcional descrito acima. Os documentos `FASE1_*`, `DELIVERY_CHECKLIST.md`, `QA_TEST_PLAN.md` e `QUICK_REFERENCE.md` continuam arquivados como registos históricos, não como inventário da aplicação.

## Teste local

Requisitos: Node.js 22+, npm e uma base PostgreSQL/Supabase.

```bash
git clone https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT.git
cd KIAZOP-BOT
cp .env.example .env
# Preenche DATABASE_URL, DIRECT_URL e os segredos locais descritos abaixo.
npm ci                         # postinstall gera o Prisma Client
npm run db:migrate:deploy       # aplica a migration inicial
npm run dev
```

Abre [http://localhost:3000/register](http://localhost:3000/register), cria a empresa, adiciona pessoas em **Equipa**, cria uma tarefa e configura o WhatsApp em **WhatsApp**. Para verificar sem Meta, os testes unitários usam mocks e não precisam de uma base de dados:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm audit --audit-level=moderate
```

O GitHub Actions executa estes controlos em cada push/PR e pode ser iniciado em **Actions → CI → Run workflow**. [Ver workflow](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions/workflows/ci.yml).

## Deploy na Vercel em 3 passos

1. **Cria uma base PostgreSQL no Supabase** e importa este repositório na Vercel. Nas variáveis do projecto, define `DATABASE_URL` (pooler do Supabase) e `DIRECT_URL` (ligação directa usada pelo Prisma Migrate).
2. **Define os segredos de produção**, aplica a migration e faz Deploy. Usa os nomes e instruções da secção [Variáveis de ambiente](#variáveis-de-ambiente). Na tua máquina, com o `.env` preenchido com as mesmas URLs: `npm ci && npm run db:migrate:deploy`. A Vercel executa `prisma generate` no `postinstall` e no build.
3. **Abre `/register` e liga a Meta em `/setup`**. Cola token, Phone Number ID e WABA ID; regista na Meta a Callback URL e o Verify Token mostrados; subscreve o campo `messages`. Para envio real, aprova primeiro na Meta o template configurado em `META_TASK_TEMPLATE_NAME`.

`vercel.json` mantém a configuração intencionalmente mínima. O webhook persiste o evento antes de devolver o ACK e usa `after()` para começar o processamento fora da resposta HTTP. Para reprocessar eventos pendentes e enviar lembretes, agenda os endpoints cron abaixo com `Authorization: Bearer $CRON_SECRET`. A frequência de 5 minutos para lembretes requer um scheduler que permita essa frequência (por exemplo, Vercel Pro); não se assume que esteja disponível no plano Hobby.

- `GET /api/cron/process-events` — tenta novamente eventos pendentes, até cinco tentativas.
- `GET /api/cron/reminders` — envia a tarefa que vence nos próximos cinco minutos usando um template aprovado.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL PostgreSQL pooled, runtime da aplicação |
| `DIRECT_URL` | Sim | URL PostgreSQL directa, Prisma Migrate e geração do client |
| `NEXTAUTH_SECRET` | Sim | Assinatura das sessões; aleatório e exclusivo de produção |
| `NEXTAUTH_URL` | Produção | URL canónica da aplicação, por exemplo `https://app.ao` |
| `APP_URL` | Recomendado | URL pública usada para construir a callback do webhook |
| `ENCRYPTION_KEY` | Sim | Base64 de exactamente 32 bytes, cifra tokens Meta por tenant |
| `META_APP_SECRET` | Sim em produção | Verifica `X-Hub-Signature-256` nos webhooks |
| `META_GRAPH_API_VERSION` | Recomendado | Versão suportada pela tua app Meta, por exemplo `v23.0` |
| `META_TASK_TEMPLATE_NAME` | Para mensagens iniciadas pela empresa | Nome exacto do template aprovado |
| `META_TEMPLATE_LANGUAGE` | Para mensagens iniciadas pela empresa | Código de idioma do template, por exemplo `pt_PT` |
| `CRON_SECRET` | Para cron | Segredo longo usado no header Bearer dos endpoints `/api/cron/*` |

Gera segredos fortes localmente, sem os partilhar nem os commitar:

```bash
openssl rand -base64 32  # NEXTAUTH_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY (tem de descodificar para 32 bytes)
openssl rand -base64 32  # CRON_SECRET
```

`.env.example` contém o formato das variáveis, não credenciais funcionais. Na Supabase, URL-encode caracteres especiais da password; usa a URL `pooler` em `DATABASE_URL` e a URL directa em `DIRECT_URL`.

## WhatsApp e conformidade Meta

O template usado para lembretes tem de ser criado e aprovado no WhatsApp Manager com este conteúdo (os marcadores correspondem aos três parâmetros enviados pelo código):

> Olá {{1}}, tens a tarefa {{2}} para {{3}}. Responde FEITO quando acabar.

O teste de onboarding envia esse mesmo template com valores de demonstração. Mensagens de texto do bot são respostas a mensagens iniciadas pelo funcionário (janela de atendimento Meta). Para tarefas agendadas, o scheduler chama `/api/cron/reminders`.

O webhook usa **Node.js runtime**, não Edge: o Prisma com adapter `pg` requer runtime Node. O endpoint valida assinatura, grava o evento e evita chamadas à Graph API antes do ACK; ainda assim, não é tecnicamente responsável prometer um limite universal de **200 ms**, pois o ACK inclui uma gravação PostgreSQL e a latência de rede/base de dados varia. Eventos repetidos são idempotentes por tenant e ID Meta.

## Isolamento de tenant e limites

As páginas e APIs autenticadas chamam `getTenantId()` e incluem `tenantId` em todas as leituras/escritas de negócio. A identidade vem da sessão NextAuth assinada; não há header de tenant confiado. A configuração Meta é resolvida pelo Phone Number ID e cada evento mantém o tenant associado. A relação composta entre funcionário e tarefa impede, também na base de dados, atribuições cruzadas entre empresas.

A aplicação **não declara RLS PostgreSQL** nesta entrega. O isolamento de aplicação está implementado, mas clientes que exijam defesa em profundidade devem adicionar RLS com contexto de tenant por transacção e validar essa configuração no ambiente Supabase antes de produção regulada. O registo inicial está aberto; antes de lançamento público, acrescenta verificação de email e protecção anti-abuso/rate-limit distribuída.

## API principal

- `GET /api/health` — estado do serviço.
- `GET, POST /api/webhooks/whatsapp` — desafio Meta e ingestão assinada.
- `GET, POST, PATCH /api/tasks` — listar, atribuir e actualizar tarefas do tenant autenticado.
- `GET, POST /api/employees` — listar e adicionar membros do tenant autenticado.
- `POST /api/setup/whatsapp` — guardar credenciais cifradas e gerar verify token.
- `POST /api/setup/whatsapp/test` — enviar template aprovado para um número `+244`.

## Estrutura

```text
src/app/                 páginas App Router (dashboard, tarefas, equipa, setup, auth, API)
src/components/          navegação e formulários client pequenos
src/lib/                 autenticação, tenant, Prisma, limites, bot, cifragem e WhatsApp
prisma/schema.prisma     modelos, relações e índices multi-tenant
prisma/migrations/       migration inicial PostgreSQL
.github/workflows/ci.yml lint, tipos, testes, build e auditoria
vercel.json              configuração mínima da Vercel
```
