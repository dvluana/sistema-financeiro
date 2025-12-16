# Integração WhatsApp Business API - Documentação

## Status: Em Desenvolvimento

---

## Objetivo

Criar um bot no WhatsApp que permite ao usuário gerenciar lembretes/compromissos via mensagens de texto natural, integrado com o Google Calendar.

### Exemplos de uso:
```
Usuário: "reunião hoje às 15h"
Bot: "✅ Criei 'Reunião' para hoje às 15:00"

Usuário: "meus compromissos"
Bot: "Você tem 3 compromissos hoje:
      1. Reunião - 15:00
      2. Dentista - 17:30
      ..."
```

---

## O que já foi feito

### 1. Pesquisa e Planejamento
- [x] Análise da referência (meuassessor.com)
- [x] Estudo das opções de API (WhatsApp Cloud API vs BSPs)
- [x] Definição da arquitetura técnica
- [x] Planejamento do MVP

### 2. Configuração no Meta Business
- [x] App criado no Meta for Developers
- [x] Produto WhatsApp adicionado ao app
- [x] Teste de envio de mensagem via API (funcionando)

### 3. Credenciais Obtidas
```
Phone Number ID: 834116836461300
Access Token: (temporário, expira em 24h - precisa gerar permanente)
Número de teste: Configurado pelo Meta
```

### 4. Teste de API
- [x] Mensagem de teste enviada com sucesso via curl
- [x] Resposta recebida: `"message_status": "accepted"`

---

## Pendências

### Alta Prioridade (MVP)

#### 1. Configurar Webhook no Meta
- [ ] Definir Verify Token (sugestão: `financify_whatsapp_verify_2025`)
- [ ] Obter App Secret (Configurações do App > Básico > Chave Secreta)
- [ ] Configurar URL do webhook no painel Meta

#### 2. Implementar Backend
- [ ] Criar `apps/api/src/routes/whatsapp.routes.ts` (webhook)
- [ ] Criar `apps/api/src/services/whatsapp.service.ts` (envio/recebimento)
- [ ] Criar `apps/api/src/services/whatsapp-ai.service.ts` (parser de lembretes)
- [ ] Adicionar variáveis de ambiente no `.env` e Heroku

#### 3. Atualizar Google Calendar Service
- [ ] Alterar escopo OAuth de `calendar.readonly` para `calendar` (permitir criar eventos)
- [ ] Implementar função `createEvent()` no service

#### 4. Criar Tabela de Vinculação
- [ ] Migration `006_whatsapp_vinculacoes.sql`
- [ ] Vincular telefone WhatsApp com usuário do sistema

#### 5. Gerar Token Permanente
- [ ] Criar System User no Meta Business Manager
- [ ] Gerar token com permissão `whatsapp_business_messaging`

### Média Prioridade (Pós-MVP)

- [ ] Comando "meus compromissos" para listar eventos
- [ ] Editar/cancelar eventos via WhatsApp
- [ ] Confirmação antes de criar evento
- [ ] Notificações proativas (lembrar antes do evento)

### Baixa Prioridade (Futuro)

- [ ] Integração com funcionalidades financeiras (gastos, receitas)
- [ ] Multi-idioma
- [ ] Lembretes recorrentes

---

## Arquitetura Técnica

### Fluxo de Mensagens
```
[Usuário WhatsApp]
       |
       v (webhook POST)
[Heroku - API Fastify]
       |
       v
[WhatsApp Routes] --> [Verifica vinculação telefone/usuário]
       |
       v
[AI Service (Gemini)] --> Interpreta "reunião hoje 15h"
       |                   Extrai: título, data, horário
       v
[Google Calendar Service] --> Cria evento
       |
       v
[WhatsApp API] --> Envia resposta ao usuário
```

### Estrutura de Arquivos (a criar)
```
apps/api/src/
├── routes/
│   └── whatsapp.routes.ts        # Webhook endpoints
├── services/
│   ├── whatsapp.service.ts       # Envio/recebimento de mensagens
│   └── whatsapp-ai.service.ts    # Parser de linguagem natural
└── types/
    └── whatsapp.types.ts         # Tipos do webhook
```

### Banco de Dados (nova tabela)
```sql
CREATE TABLE whatsapp_vinculacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  telefone VARCHAR(20) UNIQUE NOT NULL,  -- formato: 5511999999999
  verificado BOOLEAN DEFAULT FALSE,
  codigo_verificacao VARCHAR(6),
  codigo_expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id)
);
```

---

## Variáveis de Ambiente Necessárias

### Já configuradas
```bash
# Google Calendar (já funcionando) - valores no .env local e Heroku
GOOGLE_CLIENT_ID=<seu_client_id>
GOOGLE_CLIENT_SECRET=<seu_client_secret>
GOOGLE_REDIRECT_URI=http://localhost:3333/api/google-calendar/callback
TOKEN_ENCRYPTION_KEY=<chave_32_caracteres_hex>
```

### A configurar (WhatsApp)
```bash
WHATSAPP_VERIFY_TOKEN=financify_whatsapp_verify_2025  # você define
WHATSAPP_ACCESS_TOKEN=<token_permanente_do_meta>      # gerar no Meta
WHATSAPP_PHONE_NUMBER_ID=834116836461300              # já temos
WHATSAPP_APP_SECRET=<secret_do_app>                   # pegar no Meta
```

---

## Decisões Técnicas

### API Escolhida: WhatsApp Cloud API (Meta)
**Justificativa:**
- Gratuito para começar (1.000 conversas/mês grátis)
- Sem intermediários (sem markup de BSPs)
- Integração direta, similar ao Google OAuth já implementado
- Escalável quando necessário

### Número de Telefone
**Opções:**
1. **Número de teste do Meta** - Para desenvolvimento (atual)
2. **Chip pré-pago novo** (~R$15) - Para produção MVP
3. **Número virtual** (~R$25/mês) - Para parecer mais profissional

**Recomendação:** Começar com número de teste, migrar para chip próprio quando for para produção.

---

## Custos Estimados

| Item | Custo |
|------|-------|
| WhatsApp Cloud API | Grátis (1.000 conversas/mês) |
| Mensagens adicionais | ~R$0,10-0,25 por conversa |
| Número próprio (chip) | ~R$15 (único) |
| Número virtual (opcional) | ~R$25/mês |
| Heroku | Já incluso no plano atual |

---

## Configuração do Webhook no Meta

### URL do Webhook
```
https://sistema-financeiro-31052bfaa1f9.herokuapp.com/webhook/whatsapp
```

### Passos para configurar:
1. Acessar [Meta for Developers](https://developers.facebook.com)
2. Ir em WhatsApp > Configuração
3. Em "Webhook", clicar em "Editar"
4. Preencher:
   - URL de callback: `https://sistema-financeiro-31052bfaa1f9.herokuapp.com/webhook/whatsapp`
   - Token de verificação: `financify_whatsapp_verify_2025`
5. Clicar em "Verificar e salvar"
6. Marcar o campo `messages` para receber mensagens

**Nota:** O endpoint precisa estar implementado antes de verificar.

---

## Referências

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Google Calendar API - Create Events](https://developers.google.com/calendar/api/v3/reference/events/insert)
- [Referência de Design: meuassessor.com](https://www.meuassessor.com)

---

## Histórico de Alterações

| Data | Alteração |
|------|-----------|
| 2025-12-16 | Criação do documento |
| 2025-12-16 | Teste de API realizado com sucesso |
| 2025-12-16 | Planejamento do MVP concluído |
