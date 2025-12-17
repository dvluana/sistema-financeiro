# 🔍 Gaps Identificados - Lançamento Rápido com IA

## 📊 Resultados do Teste Inicial

**Taxa de Sucesso**: ~60% (muitos gaps críticos)

## ❌ Gaps Críticos Encontrados

### 1. **Classificação de Tipo Incorreta** 🔴 CRÍTICO

**Problema**: IA está classificando entradas como saídas

| Input | Esperado | Recebido | Impacto |
|-------|----------|----------|---------|
| `salário 5000` | entrada | **saida** | Alto - Afeta todos os salários |
| `freela 5k` | entrada | **saida** | Alto - Afeta freelances |
| `dividendos 150` | entrada | **saida** | Alto - Afeta investimentos |

**Causa Raiz**: 
- Prompt da IA não está sendo claro o suficiente sobre quando algo é entrada
- Validação de tipo (`validarTipo`) não está corrigindo casos óbvios

**Solução**:
1. Melhorar `SYSTEM_PROMPT` com mais exemplos de entrada
2. Adicionar keywords de entrada no pré-processamento
3. Melhorar `validarTipo()` para detectar palavras-chave inequívocas

### 2. **Categorização Incorreta** 🟡 MÉDIO

**Problema**: Categorias sendo atribuídas incorretamente

| Input | Esperado | Recebido | Impacto |
|-------|----------|----------|---------|
| `gasolina 200` | default-transporte | **default-moradia** | Médio - Categoria errada afeta relatórios |
| `salário 5000` | default-salario | **default-outros-saida** | Alto - Categoria padrão não aplicada |

**Causa Raiz**:
- Keywords de categorização podem estar conflitando
- IA não está priorizando categorias específicas sobre genéricas

**Solução**:
1. Revisar ordem de verificação de keywords
2. Adicionar mais exemplos específicos no prompt
3. Melhorar fallback de categorização

### 3. **Nomes Truncados** 🟡 MÉDIO

**Problema**: Nomes sendo cortados incorretamente

| Input | Esperado | Recebido |
|-------|----------|----------|
| `fatura c6 2500` | "Fatura C6" | **"Fatura c"** |

**Causa Raiz**:
- IA pode estar interpretando "c6" como número ou caractere especial
- Limite de caracteres no nome pode estar cortando

**Solução**:
1. Verificar limite de caracteres no nome (atualmente 50)
2. Melhorar prompt para preservar nomes completos
3. Adicionar validação pós-processamento

### 4. **Extração de Dia Previsto** 🟢 BAIXO

**Problema**: Dia não está sendo extraído em alguns casos

| Input | Esperado | Recebido |
|-------|----------|----------|
| `aluguel 5 2400` | diaPrevisto: 5 | ❓ Não testado completamente |

**Status**: Precisa de mais testes

## 🔧 Correções Prioritárias

### Prioridade 1 - Tipo Incorreto

```typescript
// apps/api/src/services/ai.service.ts

// Adicionar no SYSTEM_PROMPT:
## REGRA CRÍTICA DE TIPO

**SALÁRIO SEMPRE É ENTRADA**
- "salário", "salario", "sal" → SEMPRE entrada
- "holerite", "13º", "férias" → SEMPRE entrada

**DIVIDENDOS/RENDIMENTOS SEMPRE É ENTRADA**
- "dividendos", "dividendo" → SEMPRE entrada
- "rendimento", "juros", "resgate" → SEMPRE entrada

**FREELANCE SEMPRE É ENTRADA**
- "freela", "freelance", "freelancer" → SEMPRE entrada
```

### Prioridade 2 - Categorização

```typescript
// Melhorar ordem de verificação em categorizarPorKeywords()
// Verificar TRANSPORTE antes de MORADIA para "gasolina"
```

### Prioridade 3 - Nomes Completos

```typescript
// Adicionar validação pós-processamento
if (nome.length < 3) {
  // Tenta extrair nome completo do texto original
  nome = extrairNomeCompleto(textoOriginal, nome)
}
```

## 📈 Métricas de Melhoria

### Antes (Atual)
- Taxa de sucesso: ~60%
- Tempo médio: 400-1200ms
- Categorização correta: ~70%

### Meta
- Taxa de sucesso: >90%
- Tempo médio: <1000ms
- Categorização correta: >95%

## 🧪 Próximos Passos

1. ✅ Teste criado e executado
2. ⏳ Corrigir gaps críticos (tipo incorreto)
3. ⏳ Corrigir categorização
4. ⏳ Melhorar extração de nomes
5. ⏳ Re-executar testes
6. ⏳ Adicionar mais casos de teste

## 📝 Notas

- O teste está funcionando e identificando gaps automaticamente
- Execute `npm run test:lancamento-rapido` após cada correção
- Documente novos gaps encontrados neste arquivo

