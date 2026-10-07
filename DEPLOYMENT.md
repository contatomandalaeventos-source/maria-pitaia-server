# 🚀 Guia de Deploy - Maria Pitaia Criações

Deploy no Railway (Projeto: KORZIA-COMMERCE)

## Pré-requisitos

- Conta no Railway (app.railway.app)
- GitHub com repositório do projeto
- Variáveis de ambiente prontas

## Passo 1: Configurar Projeto no Railway

### 1.1 Criar Novo Projeto

1. Acesse [app.railway.app](https://app.railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub"
4. Conecte sua conta GitHub
5. Selecione o repositório `maria-pitaia-server`

### 1.2 Adicionar PostgreSQL

1. No projeto Railway, clique em "+ Add"
2. Selecione "Database"
3. Escolha "PostgreSQL"
4. Railway criará automaticamente uma instância

## Passo 2: Configurar Variáveis de Ambiente

No Railway, vá para **Variables**:

```
NODE_ENV=production
PORT=3000

# Railway fornecerá automaticamente:
DATABASE_URL=postgresql://...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://seu-evolution-server.com
EVOLUTION_API_TOKEN=seu_token_aqui
EVOLUTION_INSTANCE_NAME=maria_pitaia_whatsapp

# WhatsApp
WHATSAPP_NUMERO=5511985264683
WHATSAPP_NOME=Maria Pitaia Criações

# Email
EMAIL_USER=contato@mariapitaia.com.br
EMAIL_PASSWORD=sua_senha_app_aqui
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# n8n Webhooks
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/maria-pitaia
N8N_API_KEY=sua_chave_n8n

# Marketplace APIs
MERCADO_LIVRE_CLIENT_ID=seu_client_id
MERCADO_LIVRE_CLIENT_SECRET=seu_client_secret
MERCADO_LIVRE_USER_ID=seu_user_id

SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=sua_partner_key

TIKTOK_SHOP_CHANNEL_ID=seu_channel_id
TIKTOK_SHOP_ACCESS_TOKEN=seu_access_token

MAGALU_API_KEY=sua_api_key

AMAZON_ACCESS_KEY=sua_access_key
AMAZON_SECRET_KEY=sua_secret_key
AMAZON_SELLER_ID=seu_seller_id

# Empresa
EMPRESA_NOME=Maria Pitaia Criações
EMPRESA_CNPJ=22845669000117
EMPRESA_TELEFONE=1133445566
EMPRESA_EMAIL=contato@mariapitaia.com.br
EMPRESA_WHATSAPP=5511985264683

# IA
IA_PERSONALIDADE=boho_chic_artesanal
IA_TOM=amigável_e_inspirador
```

## Passo 3: Configurar Domain (URL Pública)

1. Na aba **Deploy** do seu serviço Node.js
2. Procure por **Domain**
3. Railway gera automaticamente uma URL: `https://maria-pitaia-*.railway.app`
4. Você pode adicionar um domínio customizado

## Passo 4: First Deploy

Railway faz deploy automaticamente quando você:

1. Faz push para a branch configurada (geralmente `main`)
2. Ou clica em "Deploy" manualmente na interface

### Verificar Deploy

```bash
# Ver logs
railway logs

# Verificar health
curl https://seu-dominio.railway.app/health
```

## Passo 5: Inicializar Banco de Dados

Após o primeiro deploy bem-sucedido:

```bash
# Conectar ao PostgreSQL no Railway
railway connect postgres

# As tabelas serão criadas automaticamente na primeira execução
```

## Passo 6: Configurar Webhooks Externos

### Evolution API (WhatsApp)

No painel da Evolution API:

```
Webhook URL: https://seu-dominio.railway.app/webhook/evolution
```

### Mercado Livre

No painel de Applications do Mercado Livre:

```
Subscription URL: https://seu-dominio.railway.app/webhook/mercado-livre
```

### Shopee

No Shopee Seller Center:

```
Webhook Endpoint: https://seu-dominio.railway.app/webhook/shopee
```

### TikTok Shop

No TikTok Shop Developer Portal:

```
Event Callback URL: https://seu-dominio.railway.app/webhook/tiktok-shop
```

## Passo 7: Configurar n8n

### Opção A: n8n Cloud (Recomendado)

1. Acesse [n8n.io](https://n8n.io)
2. Crie uma conta
3. Crie um espaço de trabalho para "Maria Pitaia"
4. Configure a URL base do seu servidor: `https://seu-dominio.railway.app`

### Opção B: n8n Self-Hosted

Se quiser hospedar n8n também no Railway:

1. No mesmo projeto, clique em "+ Add"
2. Selecione "Deploy from GitHub"
3. Escolha `n8n` do repositório oficial
4. Configure variáveis de ambiente

## Monitoramento

### Ver Logs

```bash
railway logs --service maria-pitaia-server
```

### Verificar Status

```bash
# Health check
curl https://seu-dominio.railway.app/health

# Deve retornar:
# {
#   "status": "ok",
#   "banco": "conectado",
#   "timestamp": "2024-10-06T15:30:00Z"
# }
```

### Metrics

Railway mostra automaticamente:
- CPU usage
- Memory usage
- Network I/O
- Request latency

## Troubleshooting

### Erro: "Database connection refused"

1. Verifique se PostgreSQL está rodando
2. Verifique DATABASE_URL está correta
3. Confira firewall settings no Railway

### Erro: "Port already in use"

Alternativamente no Railway, ele usa a porta 3000 por padrão. Se não funcionar:

```javascript
// server.js
const PORT = process.env.PORT || 3000;
```

### Erro: "Schema creation failed"

1. Conecte ao PostgreSQL
2. Execute manualmente o schema (se necessário)
3. Verifique permissões do usuário

## Backups

Railway faz backups automáticos do PostgreSQL. Para backup manual:

```bash
# Fazer backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restaurar
psql $DATABASE_URL < backup-20241006.sql
```

## Próximos Passos

1. ✅ Deploy no Railway
2. ✅ Configurar webhooks de marketplaces
3. ⬜ Importar workflows n8n
4. ⬜ Testar Evolution API
5. ⬜ Sincronizar primeiro catálogo de produtos
6. ⬜ Testar fluxo completo

## Suporte

- **Railway Support**: support.railway.app
- **Documentação**: docs.railway.app
- **Email**: contato@mariapitaia.com.br

---

**Deploy realizado por Claude Code**
Data: 2024-10-06
Projeto: KORZIA-COMMERCE
