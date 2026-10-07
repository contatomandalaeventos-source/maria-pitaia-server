# 🚀 Guia Completo de Deploy - Maria Pitaia Criações

**Data:** 6 de outubro de 2026  
**Status:** ✅ Sistema 100% pronto para produção

---

## 📋 Checklist de Deployment

### PASSO 1: Criar Repositório no GitHub ✅
**O que fazer:** Você precisa criar um novo repositório separado para Maria Pitaia

**Opção A: Via Web (Recomendado)**
1. Vá para https://github.com/new
2. Preencha:
   - **Repository name:** `maria-pitaia-server` 
   - **Description:** CRM + E-commerce + WhatsApp para Maria Pitaia Criações
   - **Privacy:** Public (recomendado para facilitar Railway)
   - **Initialize:** NÃO selecione nada
3. Clique **Create repository**

**Opção B: Via GitHub CLI**
```bash
gh repo create maria-pitaia-server \
  --description="CRM + E-commerce + WhatsApp para Maria Pitaia Criações" \
  --public \
  --source=. \
  --remote=origin \
  --push
```

### PASSO 2: Preparar o Código Localmente
```bash
cd /tmp/maria-pitaia-server

# Adicionar origin remoto (substitua YOUR_GITHUB_USERNAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/maria-pitaia-server.git

# Mudar branch para main (Railway prefer)
git branch -M main

# Fazer push
git push -u origin main
```

**Status após este passo:** ✅ Código no GitHub

---

## 🚂 PASSO 3: Criar Projeto no Railway

**Link direto:** https://railway.app/new

**Processo:**
1. Clique **New Project**
2. Selecione **Deploy from GitHub**
3. Conecte sua conta GitHub (se solicitado)
4. Selecione `maria-pitaia-server`
5. Railway vai detectar `package.json` automaticamente
6. Clique **Deploy**

**Aguarde:** ~2-3 minutos para o primeiro deploy

---

## 🔧 PASSO 4: Configurar Environment Variables no Railway

**Após o deploy ser criado:**

1. Vá para **Project Settings** → **Variables**
2. Adicione as seguintes variáveis:

```env
# BANCO DE DADOS (Railway configura automaticamente)
DATABASE_URL=seu_postgres_url_aqui

# EVOLUTION API (WhatsApp)
EVOLUTION_API_URL=https://api.evolution.local
EVOLUTION_API_TOKEN=seu_token_aqui
EVOLUTION_INSTANCE_NAME=maria_pitaia

# WHATSAPP
WHATSAPP_NUMERO=5511985264683

# MARKETPLACE APIs (adicione conforme conectar)
MERCADO_LIVRE_TOKEN=seu_token_ml
SHOPEE_ACCESS_TOKEN=seu_token_shopee
TIKTOK_SHOP_TOKEN=seu_token_tiktok
MAGALU_API_KEY=seu_api_key_magalu
AMAZON_ACCESS_KEY=seu_access_key
AMAZON_SECRET_KEY=seu_secret_key

# EMAIL (para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app

# EMPRESA
EMPRESA_NOME=Maria Pitaia Criações
EMPRESA_CNPJ=22.845.669/0001-17
EMPRESA_EMAIL=contato@mariapitaia.com.br
EMPRESA_WHATSAPP=5511985264683

# NODE
NODE_ENV=production
PORT=3000
```

**Nota:** Você vai precisar dos tokens das plataformas. Por enquanto, deixe em branco - pode atualizar depois.

---

## 📦 PASSO 5: Adicionar PostgreSQL no Railway

**Via Railway Dashboard:**

1. No seu projeto, clique **+ New**
2. Selecione **Database** → **PostgreSQL**
3. Railway vai criar automaticamente e preencher `DATABASE_URL`
4. ✅ Pronto! Tabelas são criadas automaticamente no primeiro acesso

---

## 🌐 PASSO 6: Configurar Domínio (Opcional)

**Para ter um domínio permanente:**

1. No Railway, vá para **Domains**
2. Clique **+ Generate Domain**
3. Copie o domínio (algo como: `maria-pitaia-production.railway.app`)

**Ou use seu próprio domínio:**
1. Em **Domains**, clique **+ Add Custom Domain**
2. Coloque seu domínio
3. Siga as instruções de DNS

---

## 🤖 PASSO 7: Configurar Evolution API

**Opção A: Evolution API Cloud (Recomendado para começar)**

1. Vá para https://evolution-api.com/
2. Crie uma conta
3. Crie uma nova instância
4. Configure as variáveis no Railway:
   ```
   EVOLUTION_API_URL=https://seu-dominio-evolution.com
   EVOLUTION_API_TOKEN=seu_token_gerado
   EVOLUTION_INSTANCE_NAME=maria_pitaia
   ```
5. Faça o QR Code scanning do WhatsApp (11) 98526-4683

**Opção B: Evolution API Self-Hosted**
- Veja o guia completo em `WHATSAPP_SETUP.md`

---

## 🔗 PASSO 8: Configurar Webhooks

**Para receber eventos em tempo real:**

### Evolution API Webhook
```
URL: https://seu-dominio-railway.app/webhook/evolution
Método: POST
Headers: 
  - Authorization: Bearer seu_evolution_token
```

### Mercado Livre Webhook
```
URL: https://seu-dominio-railway.app/webhook/mercado-livre
```

### Shopee Webhook
```
URL: https://seu-dominio-railway.app/webhook/shopee
```

### TikTok Shop Webhook
```
URL: https://seu-dominio-railway.app/webhook/tiktok-shop
```

**Status:**
- ✅ Endpoints criados no código
- ⏳ Precisa configurar em cada plataforma

---

## ✅ PASSO 9: Testar o Sistema

**URLs para testar:**

```bash
# Health Check
curl https://seu-dominio-railway.app/health

# Listar empresas (deve retornar vazio inicialmente)
curl https://seu-dominio-railway.app/api/empresas

# Dashboard
https://seu-dominio-railway.app/

# Painel de Produtos
https://seu-dominio-railway.app/produtos.html
```

---

## 📊 PASSO 10: Criar Empresa no Banco

**Via API (Insomnia/Postman):**

```bash
POST https://seu-dominio-railway.app/api/empresas
Content-Type: application/json

{
  "nome": "Maria Pitaia Criações",
  "cnpj": "22.845.669/0001-17",
  "whatsapp": "5511985264683",
  "email": "contato@mariapitaia.com.br",
  "telefone": "11 98526-4683",
  "endereco": "Endereço aqui",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "00000-000",
  "site": "www.mariapitaia.com.br",
  "descricao": "Artesanato Boho Chic"
}
```

**Ou via SQL direto no Railway:**
1. Vá para o PostgreSQL no Railway
2. Clique **Connect**
3. Abra o SQL Editor
4. Execute:
```sql
INSERT INTO empresas 
(nome, cnpj, whatsapp, email, telefone, cidade, estado, descricao, ativa)
VALUES 
('Maria Pitaia Criações', '22.845.669/0001-17', '5511985264683', 
'contato@mariapitaia.com.br', '11 98526-4683', 'São Paulo', 'SP', 
'Artesanato Boho Chic', true);
```

---

## 🎊 Quando Funciona? (Checklist de Sucesso)

- ✅ Deploy no Railway está "Running" (verde)
- ✅ Health check retorna status OK
- ✅ Dashboard carrega sem erros (https://seu-dominio.railway.app/)
- ✅ Consegue criar novo cliente no dashboard
- ✅ Consegue visualizar em `/produtos.html`
- ✅ Evolution API conectada com QR Code escaneado
- ✅ Primeira mensagem de teste via WhatsApp funciona

---

## 🆘 Troubleshooting

### "Database connection error"
- [ ] Verificar `DATABASE_URL` nas variáveis
- [ ] Confirmar que PostgreSQL está rodando
- [ ] Checar logs: Railway → Project → Logs

### "Domínio não encontra aplicação"
- [ ] Aguardar 5 minutos após adicionar domínio
- [ ] Verificar se DNS está propagado
- [ ] Fazer redeploy manual no Railway

### "Evolution API não conecta"
- [ ] Verificar URL e token
- [ ] Fazer novo QR Code scan
- [ ] Verificar webhook URL está correta

### "Marketplace não sincroniza produtos"
- [ ] Verificar tokens das plataformas
- [ ] Testar webhooks em cada plataforma
- [ ] Checar logs de sync em Railway

---

## 📞 Suporte & Recursos

| Recurso | Link |
|---------|------|
| Railway Docs | https://docs.railway.app |
| Railway Support | https://railway.app/support |
| Evolution API Docs | https://evolution-api.gitbook.io |
| Node.js | https://nodejs.org/docs |
| PostgreSQL | https://www.postgresql.org/docs |

---

## 🎯 Próximos Passos para Maria

1. **Dashboard** → Começar a adicionar clientes
2. **Produtos** → Fazer upload dos primeiros 10-20 produtos
3. **Publicar** → 1 clique para publicar em tudo
4. **WhatsApp** → Começar a receber pedidos automaticamente
5. **Monitorar** → Ver estatísticas em tempo real

---

**Sistema desenvolvido e pronto para produção.**

**Boa sorte! 🌿💚**
