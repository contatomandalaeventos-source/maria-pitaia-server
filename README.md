# 🌿 Maria Pitaia Criações - CRM + E-commerce

Sistema completo de CRM e automação de e-commerce para Maria Pitaia Criações - artesanato e bijuteria boho chic.

## 📋 Informações da Empresa

- **Nome**: Maria Pitaia Criações
- **CNPJ**: 22.845.669/0001-17
- **Email**: contato@mariapitaia.com.br
- **WhatsApp**: (11) 98526-4683
- **Marketplace**: Mercado Livre, Shopee, TikTok Shop, Magalu, Amazon

## 🚀 Funcionalidades

### CRM
- ✅ Gerenciamento de clientes
- ✅ Histórico de compras
- ✅ Leads e oportunidades
- ✅ Notas e observações

### E-commerce
- ✅ Catálogo de produtos
- ✅ Gestão de pedidos
- ✅ Sincronização de marketplaces
- ✅ Controle de estoque

### WhatsApp Integration
- ✅ Mensagens automáticas via Evolution API
- ✅ Confirmação de pedidos
- ✅ Atualização de entrega
- ✅ Catálogo de produtos

### Automação
- ✅ Workflows com n8n
- ✅ Follow-up automático
- ✅ Sincronização de dados
- ✅ Notificações por email

### Financeiro
- ✅ Controle de recebimentos
- ✅ Gestão de parcelas
- ✅ Relatórios de faturamento

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+
- Evolution API (para WhatsApp)
- n8n (para automações)

### Setup Inicial

1. **Clone e instale dependências:**
```bash
cd maria-pitaia-server
npm install
```

2. **Configure variáveis de ambiente:**
```bash
cp .env.example .env
# Edite .env com seus valores
```

3. **Estrutura do `.env`:**
```env
DATABASE_URL=postgresql://user:password@host:5432/maria_pitaia
EVOLUTION_API_URL=https://seu-evolution-server.com
EVOLUTION_API_TOKEN=seu_token
WHATSAPP_NUMERO=5511985264683
EMAIL_USER=contato@mariapitaia.com.br
```

4. **Inicie o servidor:**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📊 Banco de Dados

### Tabelas Criadas Automaticamente

```
✅ empresas         - Dados da empresa
✅ produtos         - Catálogo de artesanato
✅ clientes         - Clientes e contatos
✅ pedidos           - Pedidos de clientes
✅ itens_pedido      - Itens dentro de cada pedido
✅ mensagens        - Histórico de mensagens WhatsApp
✅ leads            - Leads e oportunidades
✅ financeiro       - Controle financeiro
```

### Inicialização

O banco de dados é criado **automaticamente** na primeira execução:
1. Conexão é estabelecida
2. Todas as 8 tabelas são criadas
3. Índices para performance são adicionados

## 🔌 API Endpoints

### Health Check
```
GET /health
```

### Empresas
```
GET    /api/empresas
GET    /api/empresas/:id
```

### Produtos
```
GET    /api/empresas/:empresa_id/produtos
```

### Clientes
```
GET    /api/empresas/:empresa_id/clientes
POST   /api/empresas/:empresa_id/clientes
```

### Pedidos
```
GET    /api/empresas/:empresa_id/pedidos
POST   /api/empresas/:empresa_id/pedidos
```

### Mensagens
```
GET    /api/empresas/:empresa_id/mensagens
```

### Leads
```
GET    /api/empresas/:empresa_id/leads
POST   /api/empresas/:empresa_id/leads
```

## 🤖 Vendedora IA

Sistema de assistente de vendas customizado com:
- Personalidade: Boho chic e artesanal
- Tom: Amigável e inspirador
- Recomendações automáticas de produtos
- Acompanhamento de conversas

## 📱 WhatsApp + Evolution API

### Funcionalidades

**Enviar Mensagens:**
```javascript
const whatsapp = require("./utils/whatsapp");
await whatsapp.enviarMensagem("5511985264683", "Olá! 👋");
```

**Enviar Confirmação de Pedido:**
```javascript
await whatsapp.enviarConfirmacaoPedido("5511985264683", pedido);
```

**Enviar Catálogo:**
```javascript
await whatsapp.enviarCatalogo("5511985264683", produtos);
```

### Webhooks

Configure no Evolution API:
```
https://seu-servidor.com/webhook/whatsapp
```

## 🔄 Integrações Externas

### Marketplaces
- Mercado Livre API
- Shopee API
- TikTok Shop API
- Magalu API
- Amazon SP API

### n8n Workflows
- Sincronização de pedidos
- Criação automática de clientes
- Follow-up de leads
- Relatórios periódicos

### Email
- Gmail SMTP
- Notificações automáticas
- Relatórios por email

## 📈 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "banco": "conectado",
  "timestamp": "2024-10-06T15:30:00Z"
}
```

## 🚢 Deploy no Railway

1. **Crie projeto no Railway:**
   - Projeto: KORZIA-COMMERCE (separado de Mandala)
   - Database: PostgreSQL 15+

2. **Configure variáveis no Railway:**
   - Copie todos os valores de `.env.example`
   - Use Railway PostgreSQL URL

3. **Deploy:**
   ```bash
   railway up
   ```

## 📝 Estrutura de Arquivos

```
maria-pitaia-server/
├── config/
│   └── database.js          # Configuração e schema do banco
├── utils/
│   ├── formatadores.js      # Utilitários de formatação
│   └── whatsapp.js          # Integração Evolution API
├── routes/                  # Rotas da API (futuro)
├── public/
│   ├── css/
│   └── js/
├── server.js                # Servidor principal
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔐 Segurança

- ✅ Variáveis de ambiente isoladas
- ✅ Chaves de API não no código
- ✅ HTTPS obrigatório em produção
- ✅ CORS configurado
- ✅ Rate limiting (futuro)
- ✅ Validação de entrada

## 📞 Suporte

Para dúvidas ou problemas:
- Email: contato@mariapitaia.com.br
- WhatsApp: (11) 98526-4683

---

**Desenvolvido para Maria Pitaia Criações** 🌿💚
