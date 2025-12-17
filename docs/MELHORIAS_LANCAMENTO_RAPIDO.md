# 🚀 Melhorias para Lançamento Rápido com IA

## 📌 Status Atual

- ✅ Parsing básico funcionando
- ✅ Fallback sem IA implementado
- ✅ Validação de tipos melhorada
- ⚠️ Taxa de sucesso: ~70%

## 🎯 Melhorias Prioritárias

### 1. Templates e Atalhos (Alta Prioridade)

**Objetivo**: Acelerar lançamentos comuns com comandos curtos

#### Implementação:

```typescript
// apps/api/src/services/ai.service.ts

const QUICK_TEMPLATES = {
  // Contas fixas
  agua: { nome: "Conta de água", tipo: "saida", categoria: "moradia" },
  luz: { nome: "Conta de luz", tipo: "saida", categoria: "moradia" },
  internet: { nome: "Internet", tipo: "saida", categoria: "moradia" },
  aluguel: { nome: "Aluguel", tipo: "saida", categoria: "moradia" },

  // Transporte
  uber: { nome: "Uber", tipo: "saida", categoria: "transporte" },
  "99": { nome: "99", tipo: "saida", categoria: "transporte" },
  combustivel: { nome: "Combustível", tipo: "saida", categoria: "transporte" },
  gasolina: { nome: "Gasolina", tipo: "saida", categoria: "transporte" },

  // Alimentação
  mercado: { nome: "Mercado", tipo: "saida", categoria: "alimentacao" },
  ifood: { nome: "iFood", tipo: "saida", categoria: "alimentacao" },
  feira: { nome: "Feira", tipo: "saida", categoria: "alimentacao" },

  // Entradas
  salario: { nome: "Salário", tipo: "entrada", categoria: "salario", dia: 5 },
  freela: { nome: "Freelance", tipo: "entrada", categoria: "outros-entrada" },
};

// Detectar uso: "agua 150" → Conta de água R$ 150
```

### 2. Processamento de Datas Relativas (Alta Prioridade)

**Objetivo**: Entender contexto temporal natural

#### Exemplos:

- "ontem gastei 50 no mercado" → data: ontem
- "amanhã vou pagar o aluguel" → data: amanhã
- "sexta recebi 1000" → data: última sexta
- "dia 15 conta de luz" → dia: 15

#### Implementação:

```typescript
function processarDataRelativa(texto: string): Date | null {
  const hoje = new Date();

  if (texto.includes("ontem")) {
    return subDays(hoje, 1);
  }
  if (texto.includes("amanhã")) {
    return addDays(hoje, 1);
  }
  if (texto.includes("hoje")) {
    return hoje;
  }

  // Detectar dias da semana
  const diasSemana = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];
  // ... lógica para encontrar próximo/último dia

  return null;
}
```

### 3. Histórico Inteligente (Média Prioridade)

**Objetivo**: Aprender padrões do usuário

#### Features:

- Sugerir valores baseados em histórico
- Auto-completar descrições frequentes
- Detectar recorrências automáticas
- Personalizar categorias por padrão

#### Implementação:

```typescript
interface HistoricoUsuario {
  lancamentos_frequentes: {
    nome: string;
    valor_medio: number;
    categoria: string;
    frequencia: number;
  }[];

  padroes: {
    dia_salario?: number;
    dia_aluguel?: number;
    valor_medio_mercado?: number;
  };
}
```

### 4. Processamento em Lote Avançado (Alta Prioridade)

**Objetivo**: Processar múltiplos lançamentos de forma eficiente

#### Formatos Suportados:

```
# Lista simples
mercado 500
farmácia 120
combustível 250

# Com datas
05/01 mercado 500
10/01 aluguel 2500
15/01 conta luz 200

# Formato tabela
Mercado     | 500  | saída
Salário     | 5000 | entrada
Netflix     | 45   | saída

# CSV
mercado,500,saida,alimentacao
salario,5000,entrada,salario
```

### 5. Auto-correções e Validações (Alta Prioridade)

**Objetivo**: Corrigir erros comuns automaticamente

#### Correções:

- Ortografia: "sálario" → "salário"
- Capitalização: "ifood" → "iFood", "netflix" → "Netflix"
- Formatos: "r$100" → "100", "100 reais" → "100"
- Contexto: "pix joão" → tipo: saída, categoria: transferência

### 6. Detecção de Parcelas (Média Prioridade)

**Objetivo**: Criar parcelas automaticamente

#### Exemplos:

- "parcela 3/12 carro 800" → Criar 10 parcelas restantes
- "12x de 100" → Criar 12 parcelas
- "entrada 500 + 10x 200" → Entrada + parcelas

### 7. Comandos Especiais (Baixa Prioridade)

**Objetivo**: Comandos para ações rápidas

#### Comandos:

- `/repetir` - Repete último lançamento
- `/limpar` - Limpa todos os lançamentos
- `/desfazer` - Remove último
- `/ajuda` - Mostra exemplos
- `/saldo` - Mostra saldo atual

### 8. Integração com Assistentes (Futura)

**Objetivo**: Integrar com Siri, Google Assistant, Alexa

```typescript
// Webhook para assistentes
POST /api/assistant/lancamento
{
  "text": "adicionar gasto de 50 reais no mercado",
  "source": "google_assistant",
  "user_id": "123"
}
```

### 9. Machine Learning Personalizado (Futura)

**Objetivo**: IA que aprende com cada usuário

- Treinar modelo específico por usuário
- Melhorar categorização baseada em histórico
- Prever valores baseados em padrões
- Sugerir lançamentos recorrentes

### 10. Notificações Inteligentes (Futura)

**Objetivo**: Lembretes proativos

- "Você costuma pagar o aluguel dia 10"
- "Faltou lançar o mercado desta semana"
- "Seu salário costuma cair dia 5"

## 📊 Métricas de Sucesso

### Metas para Q1 2025

- Taxa de sucesso: >95%
- Tempo médio por lançamento: <3 segundos
- Suporte a 10+ idiomas/formatos
- Zero falhas em lançamentos comuns

### KPIs

1. **Velocidade**: Tempo médio de processamento
2. **Precisão**: Taxa de acerto na categorização
3. **Adoção**: % de lançamentos via texto vs manual
4. **Satisfação**: NPS dos usuários

## 🛠️ Plano de Implementação

### Fase 1 (Imediata)

- [ ] Templates e atalhos
- [ ] Processamento de datas relativas
- [ ] Auto-correções básicas
- [ ] Melhor processamento em lote

### Fase 2 (2 semanas)

- [ ] Histórico inteligente
- [ ] Detecção de parcelas
- [ ] Comandos especiais
- [ ] Melhorias na UI

### Fase 3 (1 mês)

- [ ] Integração com assistentes
- [ ] Machine learning básico
- [ ] Notificações inteligentes
- [ ] Multi-idioma

## 🧪 Casos de Teste Críticos

```typescript
// Deve processar corretamente:
const CASOS_CRITICOS = [
  "agua luz internet total 500", // múltiplas contas
  "mercado 500 ontem", // data relativa
  "mesmo valor do mês passado", // referência
  "12x 199", // parcelas
  "salario", // template sem valor
  "pix maria 100", // transferência
  "uber volta casa 25", // contexto
];
```

## 📝 Notas de Implementação

1. **Priorizar velocidade**: Usuário espera resposta instantânea
2. **Fallback robusto**: Sempre ter alternativa sem IA
3. **Feedback claro**: Mostrar o que foi entendido
4. **Edição fácil**: Permitir correções rápidas
5. **Aprendizado contínuo**: Melhorar com uso

## 🎯 Resultado Esperado

Um sistema de lançamento rápido que:

- ✨ Entende linguagem natural perfeitamente
- ⚡ Processa instantaneamente
- 🎯 Acerta categoria e tipo sempre
- 📱 Funciona em qualquer dispositivo
- 🤖 Aprende com o usuário
- 🔄 Se integra com tudo

## 💡 Ideias Futuras

1. **OCR**: Fotografar notas fiscais
2. **QR Code**: Ler QR de pagamento
3. **Email**: Processar emails de compras
4. **SMS**: Detectar SMS de bancos
5. **Áudio**: Processar notas de voz longas
6. **Colaborativo**: Compartilhar lançamentos
7. **Gamificação**: Recompensas por uso
8. **Insights**: Análise preditiva de gastos
