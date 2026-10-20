# KIAZOP BOT

Uma base de demonstração para testar o recebimento e a normalização de webhooks do WhatsApp. O projeto inclui uma página de teste interativa, uma API de health check, verificação opcional de assinatura Meta e testes automatizados. **Ainda não é um produto SaaS completo**: funcionalidades mencionadas em documentos antigos (painel, multi-tenancy/RLS, IA, agendamento, Instagram e base de dados) não estão implementadas nesta versão do repositório.

[![CI](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions/workflows/ci.yml/badge.svg)](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions/workflows/ci.yml)

## Experimentar a demo no computador

Requisitos: Node.js 20 ou superior e npm. Não é preciso configurar PostgreSQL, Redis, conta Meta ou chave de IA para testar a demo.

```bash
git clone https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT.git
cd KIAZOP-BOT
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), altera o JSON se quiseres e clica em **Executar teste**. O exemplo mostra como uma mensagem WhatsApp é convertida num formato normalizado. O endpoint `GET /api/health` confirma que a aplicação está ativa.

## Testar no GitHub

O workflow **CI** em [Actions](https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT/actions) executa lint, verificação TypeScript, testes unitários e build em cada push e pull request. Para o executar manualmente: abre **Actions → CI → Run workflow**. O workflow valida o código; não publica uma demo pública.

Também podes executar os mesmos controlos localmente:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## API

### Health check

```bash
curl http://localhost:3000/api/health
```

### Normalização de webhook

Envia um payload Cloud API de WhatsApp para `POST /api/webhooks/whatsapp` com `Content-Type: application/json`. Em desenvolvimento, a assinatura Meta é opcional para facilitar o teste da página local.

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H 'Content-Type: application/json' \
  --data '{"entry":[{"changes":[{"value":{"messages":[{"id":"wamid.demo","from":"244923456789","timestamp":"1730000000","type":"text","text":{"body":"Olá"}}]}}]}]}'
```

A resposta contém `received`, `count` e `messages` normalizadas. Notificações de estado (sem mensagens recebidas) devolvem uma lista vazia.

### Verificação do endpoint Meta

Configura `META_WEBHOOK_VERIFY_TOKEN` no ambiente do servidor e usa o mesmo token no pedido de verificação da Meta:

```bash
META_WEBHOOK_VERIFY_TOKEN=um-token-local npm run dev
# GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=um-token-local&hub.challenge=abc
```

Para aceitar webhooks assinados, configura também `META_APP_SECRET`. Se esse segredo estiver definido, a API valida `X-Hub-Signature-256`; em produção (`NODE_ENV=production`) a API recusa receber webhooks enquanto o segredo não estiver configurado. **Não publiques segredos nem uses tokens de demonstração em produção.**

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia a aplicação em desenvolvimento |
| `npm run build` | Gera a build de produção |
| `npm start` | Serve a build de produção |
| `npm run lint` | Executa ESLint |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm test` | Executa testes unitários com Jest |
| `npm run test:coverage` | Executa testes com cobertura |

## Estado e próximos passos

Esta entrega é uma base mínima executável para experimentar o tratamento de webhooks. Persistência PostgreSQL/Redis, isolamento de tenants, autenticação, respostas automáticas com IA e publicação pública ainda precisam de implementação antes de qualquer uso real. Consulta [GETTING_STARTED.md](GETTING_STARTED.md) para configuração e desenvolvimento.
