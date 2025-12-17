# 🧪 Teste - Lançamento Rápido com IA

Este documento descreve como executar e interpretar os testes da funcionalidade de lançamento rápido com IA.

## 📋 Visão Geral

O teste abrange:
- ✅ Casos básicos (entrada/saída simples)
- ✅ Categorização automática
- ✅ Valores em diferentes formatos (R$ 1.234,56, 5k, etc.)
- ✅ Múltiplos lançamentos
- ✅ Casos edge (contexto ambíguo, valores ausentes)
- ✅ Casos que devem ser ignorados (cabeçalhos, indicadores de mês)
- ✅ Texto natural complexo

## 🚀 Como Executar

### Backend (API)

```bash
cd apps/api
npm run test:lancamento-rapido
```

Ou diretamente:

```bash
tsx src/scripts/test-lancamento-rapido.ts
```

### Frontend (Manual)

1. Abra o app em desenvolvimento
2. Clique no botão "+" (FAB)
3. Selecione "Lançamento Rápido"
4. Teste os casos abaixo manualmente

## 📝 Casos de Teste

### ✅ Casos Básicos

| Input | Esperado |
|-------|----------|
| `salário 5000` | Entrada, Salário, R$ 5000, default-salario |
| `netflix 55.90` | Saída, Netflix, R$ 55.90, default-lazer |
| `mercado R$ 1.234,56` | Saída, Mercado, R$ 1234.56, default-alimentacao |
| `freela 5k` | Entrada, Freelance, R$ 5000, default-outros-entrada |

### 🏷️ Categorização

| Input | Categoria Esperada |
|-------|-------------------|
| `nubank 3000` | default-cartao |
| `fatura c6 2500` | default-cartao |
| `gasolina 200` | default-transporte |
| `farmácia 120` | default-saude |
| `dividendos 150` | default-investimentos |

### 📅 Com Dia Previsto

| Input | Esperado |
|-------|----------|
| `aluguel 5 2400` | Dia 5, R$ 2400 |
| `Salário\t06\tR$ 3.817,55` | Dia 6, R$ 3817.55 |

### 🔢 Múltiplos Lançamentos

| Input | Quantidade Esperada |
|-------|-------------------|
| `netflix 55, mercado 500, uber 45` | 3 lançamentos |
| `netflix 55\nmercado 500\nuber 45` | 3 lançamentos |

### ⚠️ Casos Edge

| Input | Comportamento Esperado |
|-------|----------------------|
| `gastei 50 em pizza` | Extrai "Pizza" como nome |
| `recebi 500 do cliente` | Identifica como entrada |
| `500` | Ignora (sem contexto) |
| `comprei um celular` | Ignora (sem valor) |

### 🚫 Casos que Devem Ser Ignorados

| Input | Comportamento |
|-------|--------------|
| `tudo de julho` | Ignorar (indicador de mês) |
| `Cartões` | Ignorar (cabeçalho) |
| `   ` | Ignorar (vazio) |

## 📊 Interpretando Resultados

### ✅ Sucesso

```
✅ Passaram: 25
❌ Falharam: 0
📈 Taxa de sucesso: 100.0%
```

### ❌ Falhas Comuns

#### 1. Categoria Incorreta
```
❌ Cartão - Nubank
   - Categoria esperada: default-cartao, recebida: default-outros-saida
```
**Gap**: IA não está reconhecendo nomes de bancos como cartão.

#### 2. Tipo Incorreto
```
❌ Verbo explícito - Gastei
   - Tipo esperado: saida, recebido: entrada
```
**Gap**: IA não está respeitando verbos inequívocos.

#### 3. Valor Não Extraído
```
❌ Valor brasileiro - R$ 1.234,56
   - Valor esperado: 1234.56, recebido: null
```
**Gap**: Pré-processamento não está normalizando valores brasileiros.

#### 4. Múltiplos Lançamentos Não Separados
```
❌ Múltiplos lançamentos - Vírgula
   - Esperava pelo menos 3 lançamentos, mas recebeu 1
```
**Gap**: IA não está separando múltiplos lançamentos por vírgula.

## 🔧 Correções Comuns

### 1. Melhorar Prompt da IA

Se categorias estão erradas, ajuste o `SYSTEM_PROMPT` em `apps/api/src/services/ai.service.ts`:

```typescript
// Adicione exemplos mais específicos
- "nubank 3000" → tipo: "saida", categoriaId: "default-cartao", nome: "Nubank"
```

### 2. Melhorar Pré-processamento

Se valores não são extraídos, ajuste `preprocessTexto()` em `apps/api/src/services/ai.service.ts`:

```typescript
// Adicione mais padrões de normalização
result = result.replace(/R\$\s*(\d{1,3}(?:\.\d{3})+),(\d{2})/g, ...)
```

### 3. Melhorar Validação de Tipo

Se tipos estão errados, ajuste `validarTipo()` em `apps/api/src/services/ai.service.ts`:

```typescript
// Adicione mais verbos inequívocos
const VERBOS_SAIDA_INEQUIVOCOS = ['gastei', 'paguei', 'comprei', 'perdi', ...]
```

## 📈 Métricas de Qualidade

### Taxa de Sucesso Esperada

- **Mínimo aceitável**: 80%
- **Bom**: 90%
- **Excelente**: 95%+

### Tempo de Resposta

- **Máximo aceitável**: 3 segundos
- **Bom**: 1-2 segundos
- **Excelente**: < 1 segundo

## 🐛 Reportando Problemas

Ao encontrar gaps:

1. Execute o teste completo
2. Copie o output completo
3. Identifique o padrão dos erros
4. Documente em issue ou PR

## 🔄 Melhorias Contínuas

O teste deve ser expandido com:
- [ ] Casos de recorrência
- [ ] Casos de agrupadores
- [ ] Testes de performance (carga)
- [ ] Testes de segurança (injeção, XSS)
- [ ] Testes de acessibilidade (frontend)

