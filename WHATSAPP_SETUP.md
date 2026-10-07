# 📱 Setup Evolution API - WhatsApp para Maria Pitaia

Guia completo para configurar a integração de WhatsApp via Evolution API.

## O que é Evolution API?

Evolution API é uma plataforma que funciona como intermediária para integrar WhatsApp (Web API) com seus aplicativos.

**Características:**
- ✅ API REST completa
- ✅ Webhooks para eventos
- ✅ Múltiplas instâncias
- ✅ Suporte a grupos e canais

## Pré-requisitos

- Um número de WhatsApp ativo
- Telefone com WhatsApp instalado
- Acesso a um servidor para hospedar Evolution API

## Opção 1: Evolution API Cloud (Mais Fácil)

### 1.1 Registrar no Serviço

1. Acesse um provedor Evolution API (ex: Evolution Hosting)
2. Crie uma conta
3. Crie uma instância chamada: `maria_pitaia_whatsapp`

### 1.2 Gerar Token

1. No painel, vá para "API Keys"
2. Clique em "Generate New Key"
3. Copie o token (será usado em .env)

### 1.3 Conectar WhatsApp

1. Escaneie o QR Code com o WhatsApp do seu telefone
2. Autorize a conexão
3. Aguarde "Instance Connected"

## Opção 2: Evolution API Self-Hosted

### 2.1 Instalação via Docker

```bash
docker pull chatwoot/evolution-ai

docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e WEBHOOK_URL=https://seu-dominio.com/webhook/evolution \
  -e API_KEY=sua_chave_secreta \
  chatwoot/evolution-ai
```

### 2.2 Instalação Manual

```bash
# Clonar repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Editar .env com suas configurações

# Iniciar
npm start
```

## Configuração no Maria Pitaia Server

### Passo 1: Atualizar .env

```env
# Evolution API
EVOLUTION_API_URL=https://seu-evolution-server.com
EVOLUTION_API_TOKEN=seu_token_gerado
EVOLUTION_INSTANCE_NAME=maria_pitaia_whatsapp

# WhatsApp
WHATSAPP_NUMERO=5511985264683
WHATSAPP_NOME=Maria Pitaia Criações
```

### Passo 2: Testar Conexão

```bash
# Teste a conexão
curl -X GET \
  https://seu-evolution-server.com/api/instance \
  -H "Authorization: Bearer seu_token"
```

### Passo 3: Configurar Webhook

No servidor Evolution, configure:

```
POST Webhook URL: https://seu-dominio-railway.com/webhook/evolution
Eventos: messages.upsert, chats.upsert, contacts.upsert
```

## Usar a API WhatsApp no Node.js

### Enviar Mensagem Simples

```javascript
const whatsapp = require("./utils/whatsapp");

await whatsapp.enviarMensagem(
  "5511985264683",
  "Olá! 🌿 Bem-vindo à Maria Pitaia Criações!"
);
```

### Enviar Imagem

```javascript
await whatsapp.enviarImagem(
  "5511985264683",
  "https://exemplo.com/imagem.jpg",
  "Um lindo produto de artesanato! ✨"
);
```

### Enviar Catálogo de Produtos

```javascript
const produtos = [
  { nome: "Colar Boho", preco: "R$ 45,00", descricao: "Elegante e artesanal" },
  { nome: "Pulseira", preco: "R$ 30,00", descricao: "Feita à mão com amor" }
];

await whatsapp.enviarCatalogo("5511985264683", produtos);
```

### Enviar Confirmação de Pedido

```javascript
const pedido = {
  numero_pedido: "ML-123456",
  valor_total: 150.00,
  status: "confirmado"
};

await whatsapp.enviarConfirmacaoPedido("5511985264683", pedido);
```

## Receber Mensagens (Webhooks)

### Configurar Webhook Route

No `server.js` já temos:

```javascript
const { webhookEvolution } = require("./routes/webhooks");
app.post("/webhook/evolution", webhookEvolution);
```

### Processar Mensagens Recebidas

Quando um cliente envia uma mensagem:

1. Evolution API envia POST para `/webhook/evolution`
2. Sistema registra no banco em `mensagens`
3. Sistema cria/atualiza contato em `clientes`
4. Sistema cria lead se for novo contato

### Exemplo de Evento Recebido

```json
{
  "event": "message.create",
  "data": {
    "chatId": "5511985264683@c.us",
    "senderName": "João Silva",
    "body": "Olá! Gostaria de saber o preço do colar boho",
    "timestamp": 1728239400
  }
}
```

## Automações com n8n

### Workflow: Responder Automaticamente

```
Webhook (recebe mensagem)
  ↓
OpenAI (gera resposta com Vendedora IA)
  ↓
Evolution API (envia resposta)
  ↓
PostgreSQL (registra conversa)
```

### Workflow: Enviar Catálogo Automático

```
Novo Lead detectado
  ↓
Aguarda 2 minutos
  ↓
Envia mensagem de boas-vindas
  ↓
Envia catálogo de produtos
  ↓
Aguarda 24 horas
  ↓
Envia follow-up
```

## Teste da Integração

### 1. Iniciar Servidor

```bash
npm start
```

### 2. Verificar Status

```bash
curl http://localhost:3000/health
```

### 3. Testar Envio de Mensagem

```bash
curl -X POST http://localhost:3000/api/whatsapp/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "5511985264683",
    "mensagem": "Teste 🌿"
  }'
```

### 4. Receber Mensagem no WhatsApp

Envie uma mensagem para o número da instância e verifique:

- ✅ Banco de dados registra a mensagem
- ✅ Cliente é criado/atualizado
- ✅ Lead é criado se for primeiro contato
- ✅ Webhook é processado sem erros

## Troubleshooting

### Erro: "Invalid Token"

- Verifique o EVOLUTION_API_TOKEN está correto
- Confirme se ainda é válido (às vezes expira)
- Gere um novo token se necessário

### Erro: "Instance not connected"

- QR Code pode ter expirado
- Escaneie novamente via painel
- Verifique se WhatsApp está ativo no telefone

### Mensagens não chegam

- Confirme WHATSAPP_NUMERO está correto
- Verifique se número está formatado: 5511985264683 (sem espaços)
- Teste com curl primeiro

### Webhook não recebe eventos

- Confirme URL webhook está acessível
- Verifique firewall/proxy bloqueia
- Verifique logs do Evolution API

## Segurança

### Tokens e Chaves

```javascript
// NUNCA coloque direto no código:
const token = "seu_token_aqui"; // ❌ ERRADO

// Use variáveis de ambiente:
const token = process.env.EVOLUTION_API_TOKEN; // ✅ CERTO
```

### Validar Webhooks

```javascript
// Validar que webhook veio da Evolution
function validarWebhook(req, res, next) {
  const signature = req.get("x-evolution-signature");
  // Verificar assinatura...
  next();
}
```

## Limites de Taxa (Rate Limiting)

- Evolution API: 100 requisições/minuto
- WhatsApp: 60 mensagens/minuto por número

**Solução:** Implementar fila de mensagens com n8n

## Próximos Passos

1. ✅ Configurar Evolution API
2. ✅ Conectar WhatsApp
3. ✅ Testar webhooks
4. ⬜ Criar automações n8n
5. ⬜ Implementar Vendedora IA
6. ⬜ Testar com cliente real

## Recursos Úteis

- **Evolution API Docs**: https://evolution-api.gitbook.io
- **WhatsApp Business API**: https://business.facebook.com/wa/
- **n8n Workflows**: https://n8n.io/workflows
- **OpenAI API**: https://platform.openai.com/docs

---

**Setup de WhatsApp para Maria Pitaia**
Data: 2024-10-06
Contato: contato@mariapitaia.com.br
