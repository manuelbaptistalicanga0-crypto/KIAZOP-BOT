# Começar a desenvolver

## Requisitos

- Node.js 20+ e npm
- Git (para clonar o repositório)

Não precisas de Docker, PostgreSQL, Redis nem credenciais externas para executar a demonstração atual.

## Instalação e execução

```bash
git clone https://github.com/manuelbaptistalicanga0-crypto/KIAZOP-BOT.git
cd KIAZOP-BOT
npm ci
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000). A página inclui um payload WhatsApp de exemplo; carrega em **Executar teste** para chamar a API e ver as mensagens normalizadas. Podes editar o payload para experimentar outras formas. `/api/health` dá uma resposta simples de saúde do serviço.

## Validar alterações

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

O GitHub Actions executa estes mesmos passos em pushes e pull requests e também permite execução manual no separador **Actions**.

## Endpoint de webhook

- `GET /api/webhooks/whatsapp`: responde ao desafio de verificação Meta se `META_WEBHOOK_VERIFY_TOKEN` estiver configurado e corresponder ao token recebido.
- `POST /api/webhooks/whatsapp`: lê mensagens de um payload Meta e devolve o formato normalizado.
- Com `META_APP_SECRET`, valida a assinatura `X-Hub-Signature-256`. Em modo de desenvolvimento a assinatura é opcional para permitir experimentação; em produção a API não aceita eventos se o segredo não estiver configurado.

Define estas variáveis apenas no ambiente local/deploy. Nunca coloques segredos em commits.

## Âmbito atual

O código executável deste repositório está limitado à demo da interface, health check e webhook WhatsApp. Os documentos anteriores descrevem ideias e funcionalidades planeadas; não assumas que base de dados, RLS, Redis, Instagram, IA, agendamento ou painel administrativo já estejam implementados.
