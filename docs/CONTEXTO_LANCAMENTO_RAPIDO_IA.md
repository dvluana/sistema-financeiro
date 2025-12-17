# 📋 Contexto Completo - Lançamento Rápido com IA

## 🎯 Funcionalidade

### O que é
Sistema de lançamento financeiro rápido que permite ao usuário colar texto livre (de planilhas, extratos, ou digitação manual) e a IA (Google Gemini) interpreta e extrai automaticamente:
- **Tipo**: entrada (dinheiro entrando) ou saída (dinheiro saindo)
- **Nome**: descrição do lançamento
- **Valor**: valor monetário
- **Dia previsto**: dia do mês (opcional)
- **Categoria**: categoria padrão do sistema

### Fluxo Completo

1. **Frontend** (`apps/web/src/components/QuickInputSheet.tsx`)
   - Usuário cola texto ou digita no input
   - Ao clicar "Processar" (ou Enter), chama `aiApi.parseLancamentos(texto, mes)`
   - Mostra loading enquanto processa
   - Exibe lançamentos extraídos em cards editáveis
   - Usuário pode confirmar para criar todos de uma vez

2. **API** (`apps/api/src/routes/ai.routes.ts`)
   - Endpoint: `POST /api/ai/parse-lancamentos`
   - Recebe `{ texto: string, mes: string }`
   - Chama `aiService.parseLancamentos(texto, mes)`

3. **Serviço de IA** (`apps/api/src/services/ai.service.ts`)
   - Pré-processa texto (normaliza valores brasileiros, separa múltiplos lançamentos)
   - Envia prompt para Google Gemini (`gemini-2.0-flash`)
   - Recebe JSON com lançamentos
   - Valida e corrige tipo/categoria usando keywords
   - Retorna `{ lancamentos: ParsedLancamento[], erro?: string }`

## ❌ Problema Principal

**Taxa de sucesso atual: 48.6%** (18 passaram, 19 falharam de 37 testes)

### Problemas Críticos Identificados

#### 1. **Classificação de Tipo Incorreta** 🔴 CRÍTICO
A IA está classificando entradas como saídas:

| Input | Esperado | Recebido | Por quê falha |
|-------|----------|----------|---------------|
| `salário 5000` | entrada | **saida** | IA não respeita prompt |
| `freela 5k` | entrada | **saida** | IA não respeita prompt |
| `dividendos 150` | entrada | **saida** | IA não respeita prompt |
| `Loumar	R$ 3.750,00` | entrada | **saida** | Formato planilha não reconhecido como entrada |

**Causa Raiz**: 
- O prompt diz "SEMPRE entrada" mas a IA ignora
- A validação `validarTipo()` deveria corrigir mas não está funcionando
- Palavras-chave não estão sendo detectadas corretamente

#### 2. **Categorização Incorreta** 🟡 MÉDIO
Categorias sendo atribuídas incorretamente:

| Input | Esperado | Recebido |
|-------|----------|----------|
| `gasolina 200` | default-transporte | **default-moradia** |
| `salário 5000` | default-salario | **default-outros-saida** |

**Causa Raiz**:
- Keywords de transporte não estão sendo priorizadas sobre moradia
- Categoria da IA está sendo aceita mesmo quando keywords sugerem outra

#### 3. **Nomes Truncados** 🟡 MÉDIO
Nomes sendo cortados:

| Input | Esperado | Recebido |
|-------|----------|----------|
| `fatura c6 2500` | "Fatura C6" | **"Fatura c"** |
| `Stant 1	R$ 2.298,50` | "Stant 1" | **"Stant"** (perde o número) |

**Causa Raiz**:
- IA está truncando nomes
- Pós-processamento não está preservando caracteres especiais/números

#### 4. **Textos Naturais Não Interpretados** 🔴 CRÍTICO
Textos com verbos não são interpretados:

| Input | Esperado | Recebido |
|-------|----------|----------|
| `gastei 50 em pizza` | 1 lançamento | **0 lançamentos** |
| `recebi 500 do cliente` | 1 lançamento | **0 lançamentos** |
| `paguei a fatura do nubank de 3000 reais e também gastei 50 no ifood` | 2 lançamentos | **0 lançamentos** |

**Causa Raiz**:
- IA não está extraindo lançamentos de textos naturais
- Prompt pode não estar claro sobre como interpretar verbos

#### 5. **Múltiplos Lançamentos por Vírgula** 🟡 MÉDIO
Não separa corretamente:

| Input | Esperado | Recebido |
|-------|----------|----------|
| `netflix 55, mercado 500, uber 45` | 3 lançamentos | **1 lançamento** |

**Causa Raiz**:
- Pré-processamento separa por vírgula mas IA não interpreta como múltiplos
- Prompt pode não estar claro sobre separação por vírgula

## 🔧 O que foi Tentado (e não funcionou)

### 1. Melhorias no SYSTEM_PROMPT
- ✅ Adicionado regras explícitas "SEMPRE entrada" para salário, freela, dividendos
- ✅ Adicionado exemplos específicos de planilhas
- ✅ Melhorado instruções sobre formato de tabela
- ❌ **Resultado**: IA ainda ignora e classifica como saída

### 2. Validação de Tipo (`validarTipo()`)
- ✅ Adicionado detecção de palavras-chave críticas
- ✅ Tentado validar no texto original e no nome
- ✅ Adicionado validação para formato planilha
- ❌ **Resultado**: Validação não está sendo aplicada ou não detecta corretamente

**Código atual**:
```typescript
private validarTipo(tipoIA: 'entrada' | 'saida', textoOriginal: string, nome?: string): 'entrada' | 'saida' {
  const textoL = textoOriginal.toLowerCase()
  const nomeL = nome ? nome.toLowerCase() : ''

  const PALAVRAS_ENTRADA_CRITICAS = [
    'salário', 'salario', 'sal ', 'holerite', '13º', 'férias', 'ferias',
    'freela', 'freelance', 'freelancer',
    'dividendo', 'dividendos', 'rendimento', 'rendimentos', 'juros', 'resgate',
    'investimento', 'investimentos', 'ações', 'acoes', 'fii', 'fiis', 'cdb', 'poupança', 'poupanca',
  ]

  // Verifica no texto
  for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
    if (typeof palavra === 'string' && textoL.includes(palavra)) {
      if (tipoIA === 'saida') {
        return 'entrada'
      }
    }
  }
  
  // Verifica no nome
  if (nomeL) {
    for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
      if (typeof palavra === 'string' && nomeL.includes(palavra)) {
        if (tipoIA === 'saida') {
          return 'entrada'
        }
      }
    }
  }
  
  return tipoIA
}
```

**Problema**: A função existe mas parece não estar sendo chamada corretamente ou o texto não contém as palavras-chave (pode estar sendo processado antes).

### 3. Categorização por Keywords
- ✅ Reordenado para verificar transporte antes de moradia
- ✅ Adicionado validação que compara categoria da IA com keywords
- ❌ **Resultado**: Ainda classifica gasolina como moradia

**Código atual**:
```typescript
function categorizarPorKeywords(nome: string, tipo: 'entrada' | 'saida'): string {
  const nomeL = nome.toLowerCase()
  
  // Ordem específica para saídas: transporte antes de moradia
  const ordemCategoriasSaida = [
    CATEGORIAS.TRANSPORTE, // Gasolina, combustível
    CATEGORIAS.ALIMENTACAO,
    CATEGORIAS.SAUDE,
    CATEGORIAS.LAZER,
    CATEGORIAS.CARTAO,
    CATEGORIAS.MORADIA, // Por último (mais genérica)
  ]
  
  if (tipo === 'saida') {
    for (const categoriaId of ordemCategoriasSaida) {
      const keywords = KEYWORDS_CATEGORIAS[categoriaId]
      for (const keyword of keywords) {
        if (nomeL.includes(keyword)) {
          return categoriaId
        }
      }
    }
  }
  
  return tipo === 'entrada' ? CATEGORIAS.OUTROS_ENTRADA : CATEGORIAS.OUTROS_SAIDA
}
```

**Problema**: A função funciona mas a categoria da IA está sendo priorizada sobre keywords.

### 4. Pré-processamento
- ✅ Normalização de valores brasileiros (R$ 1.234,56 → 1234.56)
- ✅ Conversão de abreviações (5k → 5000)
- ✅ Separação de múltiplos por vírgula (converte para quebra de linha)
- ❌ **Resultado**: Separação por vírgula não funciona, IA não interpreta múltiplos

**Código atual**:
```typescript
private preprocessTexto(texto: string): string {
  let result = texto

  // Separa múltiplos lançamentos por vírgula
  if (result.includes(',') && !result.match(/R\$\s*\d.*,\d/)) {
    result = result.replace(/,\s+/g, '\n')
  }

  // Normaliza valores brasileiros...
  // ...
  
  return result
}
```

### 5. Validação Pós-Processamento
- ✅ Adicionado validação adicional no nome
- ✅ Adicionado validação para formato planilha
- ❌ **Resultado**: Não está funcionando, validações não estão sendo aplicadas

**Código atual** (no loop de processamento):
```typescript
let tipoValidado = this.validarTipo(tipoIA, texto, nome)

// Validação adicional no nome
const nomeLValidacao = nome.toLowerCase()
const palavrasEntradaNoNome = ['salário', 'salario', 'freela', 'freelance', 'dividendo', 'dividendos', 'projeto', 'cliente']
if (tipoValidado === 'saida' && palavrasEntradaNoNome.some(p => nomeLValidacao.includes(p))) {
  tipoValidado = 'entrada'
}

// Validação para planilha
const temTab = texto.includes('\t')
const servicosConhecidos = ['netflix', 'aluguel', 'mercado', 'farmácia', 'farmacia', 'uber', 'ifood', 'nubank', 'cartão', 'cartao', 'fatura']
const nomeEServico = servicosConhecidos.some(s => nomeLValidacao.includes(s))
if (temTab && !nomeEServico && tipoValidado === 'saida') {
  tipoValidado = 'entrada'
}
```

## 🔍 Análise Técnica

### Por que a validação não funciona?

1. **Texto pode estar sendo processado antes da validação**
   - O texto original pode ter sido modificado pelo pré-processamento
   - Palavras-chave podem ter sido removidas ou alteradas

2. **IA retorna tipo incorreto e validação não corrige**
   - A função `validarTipo()` existe mas pode não estar sendo chamada
   - Ou está sendo chamada mas não detecta as palavras-chave

3. **Prompt da IA não está sendo respeitado**
   - Mesmo com "SEMPRE entrada" no prompt, IA classifica como saída
   - Pode precisar de exemplos mais explícitos ou few-shot learning

### Arquivos Principais

1. **`apps/api/src/services/ai.service.ts`**
   - Contém `SYSTEM_PROMPT` (linha ~212)
   - Método `parseLancamentos()` (linha ~588)
   - Método `validarTipo()` (linha ~511)
   - Método `preprocessTexto()` (linha ~334)
   - Função `categorizarPorKeywords()` (linha ~136)

2. **`apps/api/src/scripts/test-lancamento-rapido.ts`**
   - Teste automatizado com 37 casos
   - Valida tipo, nome, valor, categoria, dia previsto
   - Executa: `npm run test:lancamento-rapido`

3. **`apps/web/src/components/QuickInputSheet.tsx`**
   - Componente frontend
   - Chama `aiApi.parseLancamentos()` na linha ~386

## 📊 Casos de Teste Críticos

### Casos que DEVEM passar mas estão falhando:

1. **Entrada simples - Salário**
   - Input: `salário 5000`
   - Esperado: tipo=entrada, categoria=default-salario
   - Recebido: tipo=saida, categoria=default-outros-saida

2. **Planilha - Nome + Valor**
   - Input: `Loumar	R$ 3.750,00` (TAB entre nome e valor)
   - Esperado: tipo=entrada, nome="Loumar", valor=3750
   - Recebido: tipo=saida

3. **Textos naturais**
   - Input: `gastei 50 em pizza`
   - Esperado: 1 lançamento tipo=saida, nome="Pizza"
   - Recebido: 0 lançamentos

4. **Múltiplos por vírgula**
   - Input: `netflix 55, mercado 500, uber 45`
   - Esperado: 3 lançamentos
   - Recebido: 1 lançamento

## 🎯 Objetivo

**Taxa de sucesso mínima: 90%+**

A funcionalidade precisa:
1. ✅ Interpretar corretamente tipo (entrada vs saída)
2. ✅ Categorizar corretamente
3. ✅ Preservar nomes completos
4. ✅ Interpretar textos naturais
5. ✅ Separar múltiplos lançamentos
6. ✅ Funcionar com formatos de planilha (TAB separado)

## 🛠️ Próximas Tentativas Sugeridas

1. **Melhorar o prompt com few-shot learning**
   - Adicionar mais exemplos explícitos no início do prompt
   - Usar formato de exemplos antes e depois

2. **Forçar correção mais agressiva**
   - Se detectar palavra-chave de entrada, SEMPRE forçar entrada, ignorando resposta da IA
   - Aplicar correção ANTES de processar resposta da IA

3. **Melhorar detecção de formato planilha**
   - Detectar TAB e forçar entrada se não for serviço conhecido
   - Aplicar antes da chamada à IA

4. **Melhorar parsing de textos naturais**
   - Adicionar exemplos explícitos de textos com verbos
   - Melhorar prompt para extrair de frases naturais

5. **Separar múltiplos lançamentos antes da IA**
   - Se detectar vírgulas, separar em múltiplas chamadas à IA
   - Ou melhorar prompt para interpretar múltiplos

## 📝 Variáveis de Ambiente

- `GEMINI_API_KEY`: Chave da API do Google Gemini
- Configurada em `.env` (não commitado)

## 🧪 Como Testar

```bash
cd apps/api
npm run test:lancamento-rapido
```

O teste executa 37 casos e mostra taxa de sucesso detalhada.

## 📁 Estrutura de Arquivos

```
apps/api/src/
├── services/
│   └── ai.service.ts          # Lógica principal de IA
├── routes/
│   └── ai.routes.ts           # Endpoint da API
└── scripts/
    └── test-lancamento-rapido.ts  # Teste automatizado

apps/web/src/
├── components/
│   └── QuickInputSheet.tsx    # Componente frontend
└── lib/
    └── api.ts                  # Cliente API (aiApi.parseLancamentos)
```

## 🔗 Fluxo de Dados

```
Usuário cola texto
  ↓
QuickInputSheet.handleProcess()
  ↓
aiApi.parseLancamentos(texto, mes)
  ↓
POST /api/ai/parse-lancamentos
  ↓
aiService.parseLancamentos(texto, mes)
  ↓
preprocessTexto() → normaliza valores
  ↓
Google Gemini API (gemini-2.0-flash)
  ↓
validarTipo() → corrige tipo se necessário
  ↓
categorizarPorKeywords() → corrige categoria se necessário
  ↓
Retorna { lancamentos: [...] }
  ↓
Frontend exibe cards editáveis
```

## ⚠️ Problemas Conhecidos

1. Validação de tipo não está funcionando (palavras-chave não detectadas)
2. IA ignora instruções explícitas do prompt
3. Textos naturais não são interpretados
4. Múltiplos lançamentos não são separados
5. Nomes são truncados (perde números, caracteres especiais)
6. Categorização incorreta (gasolina → moradia)

## 💡 Hipóteses

1. **Prompt muito longo**: Gemini pode estar ignorando partes do prompt
2. **Ordem das instruções**: Instruções críticas podem estar muito no final
3. **Formato do prompt**: Pode precisar de estrutura diferente (few-shot no início)
4. **Validação aplicada tarde**: Correções deveriam ser aplicadas antes de aceitar resposta da IA
5. **Texto processado**: Pré-processamento pode estar removendo palavras-chave importantes

