# Começar com o ExecutaPro

## Requisitos

- Node.js 22 ou superior
- PostgreSQL 16+ (o Supabase funciona)
- npm

## Primeira execução

1. Cria um projecto PostgreSQL e copia as URLs pooled/direct do Supabase.
2. Copia `.env.example` para `.env`, preenche `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `META_APP_SECRET` e `CRON_SECRET`. Gera segredos localmente com `openssl rand -base64 32`.
3. Instala, migra e inicia:

```bash
npm ci
npm run db:migrate:deploy
npm run dev
```

Abre [http://localhost:3000/register](http://localhost:3000/register) e cria a empresa. Adiciona a equipa em **Equipa**, atribui tarefas e configura o WhatsApp em **WhatsApp**. Para usar a API Meta, regista na Meta a callback e o Verify Token apresentados no passo 2 e subscreve `messages`.

## Testes e build

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm audit --audit-level=moderate
```

Os testes unitários isolam Prisma e Meta com mocks. O GitHub Actions corre lint, TypeScript, testes, build e auditoria em cada push/PR.

## Bot e lembretes

- `FEITO` / `1`: conclui a tarefa em aberto mais próxima do funcionário.
- `ATRASO`: pede o motivo; a próxima resposta é guardada na tarefa.
- Os lembretes usam um template previamente aprovado na Meta e são seleccionados por `/api/cron/reminders` quando vencem nos próximos cinco minutos.
- `/api/cron/process-events` tenta novamente eventos pendentes.

Ambos os cron endpoints exigem `Authorization: Bearer <CRON_SECRET>`. Configura um scheduler externo ou Vercel Pro; não publiques os endpoints sem o segredo.

## Deploy Vercel

Segue os três passos do [README](README.md#deploy-na-vercel-em-3-passos). A Vercel precisa de `DATABASE_URL` e `DIRECT_URL` durante o `postinstall`/build para o Prisma gerar o client. Aplica as migrations com `npm run db:migrate:deploy` antes de abrir a aplicação.

## Atenção

O isolamento por tenant está aplicado em sessão e queries, com FK composta para tarefas. Esta versão não configura políticas RLS PostgreSQL, verificação de email ou rate-limit distribuído no registo. Confere as notas de segurança no README antes de abrir o serviço ao público.
