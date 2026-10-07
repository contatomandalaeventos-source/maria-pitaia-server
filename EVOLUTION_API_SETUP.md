# 🤖 Setup Evolution API - WhatsApp Integração

**Para:** Maria Pitaia Criações  
**WhatsApp:** (11) 98526-4683  
**Objetivo:** Receber e enviar mensagens automaticamente

---

## 🚀 Início Rápido (Recomendado)

### Opção 1: Evolution API Cloud (MAIS FÁCIL - Comece por aqui)

**1. Criar Conta**
- Vá para: https://evolution-api.com/
- Clique **Sign Up**
- Use seu email

**2. Criar Instância**
- Dashboard → **New Instance**
- Nome: `maria-pitaia`
- Clique **Create**

**3. Copiar Credenciais**
- Você vai receber um token tipo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Copie este token

**4. Atualizar Railway**
```
EVOLUTION_API_URL = https://api.evolution.local
EVOLUTION_API_TOKEN = seu_token_aqui
EVOLUTION_INSTANCE_NAME = maria_pitaia
```

**5. QR Code Scanning**
- Acesse: `https://sua-evolucao-api.com/qr?token=seu_token`
- Abra WhatsApp do celular
- **Configurações** → **Linked Devices** → **Link a device**
- Aponte câmera para QR Code
- ✅ Conectado!

---

## 🔧 Opção 2: Evolution API Self-Hosted (Avançado)

Se quiser host próprio (mais controle, mais complexo):

### Docker Setup
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e DB_HOST=seu_postgres \
  -e DB_USER=postgres \
  -e DB_PASS=sua_senha \
  -e DB_DATABASE=evolution \
  atende/evolution-api:latest
```

### URL para Railway
```
EVOLUTION_API_URL = http://seu-host:8080
EVOLUTION_API_TOKEN = seu_token_jwt_gerado
```

---

## ✅ Testar Conexão

Após conectar, enviar mensagem de teste:

### Via cURL
```bash
curl -X POST https://api.evolution.local/message/send \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511985264683",
    "textMessage": {
      "text": "Oi Maria! Sistema testado ✅"
    }
  }'
```

### Via Node.js (no código)
```javascript
const axios = require('axios');

async function enviarMensagem() {
  try {
    const response = await axios.post(
      `${process.env.EVOLUTION_API_URL}/message/send`,
      {
        number: '5511985264683',
        textMessage: {
          text: 'Oi Maria! Sistema testado ✅'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.EVOLUTION_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Mensagem enviada:', response.data);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}
```

---

## 🔗 Configurar Webhooks

Para receber eventos (pedidos, mensagens, etc):

### No Evolution API
1. Configurações → **Webhooks**
2. Clique **+ Add Webhook**
3. Configure:
   ```
   URL: https://seu-dominio-railway.app/webhook/evolution
   Eventos: 
     ✅ messages.upsert
     ✅ messages.update
     ✅ connection.update
   ```
4. Clique **Save**

### No Código (routes/webhooks.js)
```javascript
app.post('/webhook/evolution', (req, res) => {
  const { data, instance } = req.body;
  
  // Dados da mensagem
  if (data.message) {
    const { from, body, timestamp } = data.message;
    console.log(`📩 Mensagem de ${from}: ${body}`);
    
    // Salvar no banco de dados
    // Enviar para dashboard
    // Disparar automações
  }
  
  res.json({ status: 'ok' });
});
```

---

## 📊 Fluxo Completo de Mensagem

```
Cliente envia mensagem via WhatsApp
         ↓
Evolution API recebe
         ↓
Webhook POST para /webhook/evolution
         ↓
Salva no banco (tabela: mensagens)
         ↓
Dispara automação (n8n ou Sistema)
         ↓
Resposta automática via WhatsApp
         ↓
Cliente recebe confirmação
         ↓
Maria vê tudo no Dashboard
```

---

## 🚨 Troubleshooting

### ❌ "QR Code não scaneável"
- Regenerar QR Code
- Verificar se Token está correto
- Tentar em outro celular/app

### ❌ "Mensagens não chegam"
- Verificar `EVOLUTION_API_TOKEN` em Railway
- Confirmar URL é acessível
- Testar curl manualmente
- Ver logs: Railway → Logs

### ❌ "Webhook não funciona"
- Verificar URL do webhook em Evolution API
- Testar POST manualmente
- Ver logs no Railway
- Confirmar firewall permite conexão

### ❌ "Número não reconhecido"
- Usar formato: **55** + DDD + número (sem hífen)
- Exemplo correto: `5511985264683` (não `11 98526-4683`)

---

## 📱 Mensagens Automatizadas

Exemplos de automações já no código:

### Confirmação de Pedido
```javascript
// Automático ao criar pedido
await enviarConfirmacaoPedido(cliente_whatsapp, numero_pedido);
// "Oi Maria! Recebemos seu pedido #123. 
//  Valor: R$ 299,90. Confirma?"
```

### Atualização de Entrega
```javascript
// Quando marcar como enviado
await enviarAtualizacaoEntrega(
  cliente_whatsapp, 
  numero_pedido, 
  rastreamento
);
// "Seu pedido foi despachado! 
//  Código: BR1234567890"
```

### Catálogo de Produtos
```javascript
// Enviar catálogo para cliente
await enviarCatalogo(cliente_whatsapp);
// Cliente vê lista de produtos com fotos e preços
```

---

## 🎯 Próximos Passos

1. ✅ Criar conta em evolution-api.com
2. ✅ Gerar token
3. ✅ Adicionar variáveis em Railway
4. ✅ Fazer QR Code scan
5. ✅ Testar envio de mensagem
6. ✅ Ativar webhook
7. ✅ Testar automações
8. ✅ Treinar Maria no sistema

---

## 📞 Suporte

- **Evolution API Docs:** https://evolution-api.gitbook.io
- **Comunidade Discord:** https://discord.gg/evolution-api
- **Issues GitHub:** https://github.com/EvolutionAPI/evolution-api/issues

---

**Seu WhatsApp está pronto para vender! 🚀**
