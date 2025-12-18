# Testes de Lançamentos

## Campos Disponíveis

| Campo | Manual | Rápido | Observação |
|-------|--------|--------|------------|
| Tipo (entrada/saída) | ✅ | ✅ | |
| Descrição | ✅ | ✅ | |
| Valor | ✅ | ✅ | |
| Categoria | ✅ | ✅ | |
| Data Pagamento/Recebimento | ✅ | ✅ | |
| Data Vencimento | ✅ | ✅ só saída | |
| Já paguei/recebi | ✅ | ✅ | |
| Criar como grupo | ✅ só criar | ✅ | |
| Modo valor (soma/fixo) | ✅ | ✅ | |
| Recorrência | ✅ só criar | ✅ | |

---

## 1. CRIAR LANÇAMENTO SIMPLES

### Manual
- [x] Criar entrada sem categoria
- [x] Criar saída sem categoria
- [x] Criar com categoria existente
- [ ] Criar categoria nova inline
- [x] Criar com data de pagamento
- [ ] Criar saída com data de vencimento
- [x] Criar marcado como pago/recebido
- [ ] Atalhos de valor (R$ 50, 100, 200, 500, 1000)
- [x] Valor com vírgula (1.234,56)

### Rápido
- [ ] Texto simples: `Netflix 55,90`
- [ ] Múltiplos: `Netflix 55,90, Spotify 19,90`
- [ ] Com dia: `Aluguel 2500 dia 5`
- [ ] Planilha (tab separado)
- [ ] Editar tipo após parse
- [ ] Editar valor após parse
- [ ] Editar nome após parse
- [ ] Adicionar categoria
- [ ] Adicionar data
- [ ] Remover item da lista

---

## 2. GRUPOS (AGRUPADORES)

### Criar Grupo - Manual
- [x] Grupo modo SOMA (valor deve ser 0, campo valor oculto)
- [x] Grupo modo FIXO (campo valor visível, obrigatório)
- [ ] Grupo com categoria
- [ ] Grupo com data
- [x] Grupo entrada
- [x] Grupo saída

### Criar Grupo - Rápido
- [ ] Marcar como grupo após parse
- [ ] Trocar modo soma/fixo
- [ ] Grupo + recorrência (12 grupos criados)
- [ ] Grupo + parcelas (N grupos criados)

### Adicionar Filhos ao Grupo
- [x] Adicionar filho via botão "+"
- [x] Filho com valor
- [ ] Filho com categoria
- [ ] Filho com data
- [ ] Filho marcado como pago
- [x] Verificar soma atualiza no grupo (modo soma)
- [x] Verificar soma NÃO atualiza no grupo (modo fixo)

### Editar Grupo
- [x] Editar nome do grupo
- [ ] Editar data do grupo
- [ ] Trocar categoria do grupo
- [ ] Toggle pago/não pago do grupo
- [ ] **NÃO pode trocar modo soma/fixo após criar**

### Editar Filhos
- [ ] Editar nome do filho
- [x] Editar valor do filho
- [ ] Editar data do filho
- [ ] Editar categoria do filho
- [ ] Toggle pago/não pago do filho

### Excluir
- [x] Excluir grupo SEM filhos
- [x] Excluir grupo COM filhos (filhos excluídos em CASCADE)
- [x] Excluir filho individual
- [x] Verificar recálculo soma após excluir filho

---

## 3. RECORRÊNCIA

### Criar Recorrência - Manual
- [x] Mensal (12x) - SAÍDA
- [x] Mensal (12x) - ENTRADA
- [x] Parcelado (definir quantidade) - SAÍDA
- [x] Parcelado (definir quantidade) - ENTRADA
- [x] Parcelado com 2 parcelas (mínimo)
- [x] Parcelado com 60 parcelas (máximo)
- [x] Recorrência + grupo modo soma
- [x] Recorrência + grupo modo fixo
- [x] Verificar nomenclatura parcelas: "Nome (1/6)", "Nome (2/6)"...
- [x] Verificar nomenclatura mensal: mesmo nome em todos
- [x] Verificar cada mês tem lançamento separado
- [x] Verificar `recorrencia_id` é o mesmo para todos

### Criar Recorrência - Rápido
- [ ] Ativar recorrência em item
- [ ] Trocar de mensal para parcelado
- [ ] Ajustar quantidade parcelas
- [ ] Múltiplos itens, alguns com recorrência outros sem
- [ ] Recorrência como ENTRADA via QuickInput

---

## 4. EDITAR RECORRÊNCIA EM LOTE

### Dialog de Escopo - Comportamento
- [ ] Ao editar recorrente, dialog aparece com 3 opções
- [x] "Apenas este" - contagem mostra 1
- [x] "Este e próximos" - contagem mostra N restantes
- [x] "Todos" - contagem mostra total da série
- [ ] Dialog fecha após operação bem sucedida
- [ ] Sheet fecha após operação bem sucedida
- [ ] Loading spinner durante operação

### Apenas Este
- [x] Editar nome - apenas este muda
- [x] Editar valor - apenas este muda
- [ ] Editar data - apenas este muda
- [ ] Editar categoria - apenas este muda
- [ ] Toggle concluído - apenas este muda
- [x] Verificar outros meses inalterados (navegar e conferir)

### Este e Próximos
- [ ] Editar nome - atual e futuros mudam
- [x] Editar valor - atual e futuros mudam
- [ ] Editar categoria - atual e futuros mudam
- [x] Parcelas anteriores inalteradas
- [x] Verificar contagem correta no dialog
- [x] **Edge case:** Quando é o ÚLTIMO da série (deve afetar só 1)
- [ ] **Edge case:** Opção desabilitada quando só tem 1 restante

### Todos
- [x] Editar nome - todos mudam
- [x] Editar valor - todos mudam
- [ ] Editar categoria - todos mudam
- [x] Parcelas passadas E futuras mudam
- [ ] Warning se alguns já pagos
- [ ] **Edge case:** Série com apenas 1 item restante

### Cenários Especiais - Edição
- [ ] Editar parcela com nome personalizado (ex: "Netflix (3/12)" editado para "Netflix Fev")
- [x] Escopo "todos" sobrescreve nomes personalizados
- [ ] Editar data (só dia muda, mês preservado)
- [ ] Editar lançamento no meio da série
- [x] Série com alguns já excluídos (não causa erro)
- [ ] Série com alguns já pagos (warning no dialog)
- [ ] Grupo recorrente (filhos NÃO são afetados pela edição)
- [x] Editar ENTRADA recorrente (não só saída)
- [ ] Editar item criado via QuickInput

### Lançamentos Legados (sem recorrencia_id)
- [x] Dialog NÃO mostra opções de escopo
- [x] Edita apenas o lançamento atual
- [x] Comportamento idêntico ao anterior

---

## 5. EXCLUIR RECORRÊNCIA EM LOTE

### Dialog de Escopo - Comportamento
- [ ] Ao excluir recorrente, dialog aparece com 3 opções
- [ ] Visual vermelho (ação destrutiva)
- [x] Contagem clara de quantos serão excluídos
- [ ] Dialog fecha após operação bem sucedida
- [ ] Sheet fecha após operação bem sucedida
- [ ] Loading spinner durante operação

### Apenas Este
- [x] Exclui apenas o lançamento atual
- [x] Outros da série permanecem
- [x] Nomenclatura das parcelas NÃO reajusta
- [x] Totais atualizados no dashboard

### Este e Próximos
- [x] Exclui atual e todos futuros
- [x] Parcelas anteriores permanecem
- [x] Verificar contagem correta
- [x] **Edge case:** Quando é o ÚLTIMO da série (só exclui 1)
- [ ] **Edge case:** Opção desabilitada quando só tem 1 restante

### Todos
- [x] Exclui toda a série
- [x] Verificar nenhum resta
- [x] Totais zerados no dashboard para aquela série
- [ ] **Edge case:** Série com apenas 1 item restante

### Cenários Especiais - Exclusão
- [x] Série com alguns já excluídos (conta só existentes)
- [ ] Série com alguns já pagos (warning antes)
- [x] Excluir grupo recorrente SEM filhos
- [ ] Excluir grupo recorrente COM filhos (CASCADE funciona)
- [x] Excluir do primeiro mês da série
- [x] Excluir do último mês da série
- [x] Excluir do meio da série
- [x] Excluir ENTRADA recorrente (não só saída)

### Lançamentos Legados (sem recorrencia_id)
- [x] Dialog NÃO mostra opções de escopo
- [x] Exclui apenas o lançamento atual
- [x] Comportamento idêntico ao anterior

---

## 6. VALIDAÇÕES E ERROS

### Campos Obrigatórios
- [x] Descrição vazia
- [x] Valor vazio (exceto grupo soma)
- [x] Valor zero (exceto grupo soma)
- [x] Valor negativo
- [x] Parcelas < 2
- [x] Parcelas > 60

### Categoria
- [ ] Criar categoria duplicada
- [ ] Categoria nome vazio
- [ ] Excluir categoria em uso

### Datas
- [ ] Data inválida
- [ ] Data muito antiga
- [ ] Data muito futura
- [ ] Dia 31 em mês com 30 dias

### Erros de API - Recorrência
- [ ] Timeout em operação em lote
- [ ] Erro ao buscar infoRecorrencia (API offline)
- [x] ID de lançamento inexistente
- [x] Escopo inválido na query string
- [ ] Tentar editar lançamento de outro perfil (403)
- [ ] Tentar excluir lançamento de outro usuário (403)

### Erros de API - Resiliência
- [ ] Dialog permanece aberto se operação falhar
- [ ] Mensagem de erro clara para o usuário
- [ ] Possibilidade de tentar novamente

---

## 7. FLUXOS CRÍTICOS

### Criar múltiplos via Rápido
```
Netflix 55,90, Spotify 19,90, Aluguel 2500 dia 5
```
- [ ] Verificar 3 itens parseados
- [ ] Editar um item
- [ ] Remover um item
- [ ] Confirmar criação
- [ ] Verificar no dashboard

### Criar grupo recorrente
- [x] Manual: Cartão de Crédito, grupo soma, mensal
- [x] Verificar 12 grupos criados (um por mês)
- [x] Adicionar filho no mês atual
- [x] Navegar para próximo mês, verificar grupo vazio

### Editar lançamento existente
- [ ] Abrir drawer de edição
- [ ] **Tipo bloqueado** (não pode trocar entrada/saída)
- [ ] **Grupo/recorrência ocultos** (só aparecem na criação)
- [ ] Alterar valor
- [ ] Alterar data
- [ ] Salvar

### Concluir/Desconcluir
- [ ] Toggle via checkbox na lista
- [ ] Toggle via switch no drawer
- [ ] Filho de grupo
- [ ] Verificar totais atualizados (já paguei vs falta pagar)

### Fluxo Completo de Recorrência
1. [x] Criar "Aluguel" mensal (12x) a partir de janeiro
2. [x] Verificar 12 lançamentos criados
3. [x] Marcar jan/fev/mar como pagos (individualmente)
4. [x] Editar valor em abril com escopo "este e próximos"
5. [x] Verificar jan/fev/mar com valor antigo
6. [x] Verificar abr até dez com valor novo
7. [x] Excluir outubro com escopo "apenas este"
8. [x] Verificar nov/dez ainda existem
9. [x] Excluir novembro com escopo "este e próximos"
10. [x] Verificar apenas jan-set existem

### Fluxo Grupo Recorrente com Filhos
1. [x] Criar "Cartão Nubank" grupo soma mensal
2. [x] Adicionar filho "Netflix" R$55 no mês atual
3. [x] Adicionar filho "Spotify" R$20 no mês atual
4. [x] Verificar soma = R$75 no grupo
5. [x] Editar nome do grupo para "Nubank" com escopo "todos"
6. [x] Verificar filhos NÃO foram afetados (ainda "Netflix" e "Spotify")
7. [x] Navegar para próximo mês, verificar grupo vazio
8. [x] Excluir grupo do mês atual com escopo "apenas este"
9. [x] Verificar filhos daquele mês foram excluídos (CASCADE)
10. [x] Verificar grupos de outros meses permanecem

### Fluxo Navegação Entre Meses
1. [ ] Criar recorrência de 6 parcelas
2. [ ] Navegar para mês 3
3. [ ] Editar com escopo "este e próximos"
4. [ ] Verificar meses 1-2 inalterados
5. [ ] Verificar meses 3-6 alterados
6. [ ] Dashboard recarregou automaticamente

### Fluxo de ENTRADA Recorrente
1. [x] Criar "Salário" como ENTRADA mensal (12x)
2. [x] Verificar 12 entradas criadas
3. [x] Editar valor com escopo "todos"
4. [x] Verificar todas alteradas
5. [x] Excluir com escopo "este e próximos"
6. [x] Verificar comportamento idêntico a saídas

---

## 8. BUGS CONHECIDOS

- [x] Parser: "Mercado Pago Emp" vira "Pago Emp" (confunde com status pago) ✓ CORRIGIDO
- [x] Parser: Valor 0 é filtrado (não cria grupos modo soma via texto) ✓ CORRIGIDO
- [x] Edição: Não mostra opção de grupo/recorrência ✓ COMPORTAMENTO ESPERADO (só criação)

---

## 9. DATABASE E BACKEND

### Migration
- [x] Campo `recorrencia_id` criado na tabela `lancamentos`
- [x] Índice em `recorrencia_id` para performance
- [x] Índice composto `(recorrencia_id, perfil_id, mes)` existe
- [x] Lançamentos existentes têm `recorrencia_id = NULL`

### Endpoints
- [x] `GET /api/lancamentos/:id/recorrencia` - info da série
- [x] `PUT /api/lancamentos/:id/recorrencia` - atualizar em lote
- [x] `DELETE /api/lancamentos/:id/recorrencia?escopo=X` - excluir em lote

### Performance
- [ ] Operação em lote usa query única (não N queries)
- [x] Máximo 60 lançamentos por série (validação)
- [x] Série grande (60 parcelas) completa em < 2s

### Integridade de Dados
- [x] `perfil_id` respeitado em operações em lote
- [x] Não mistura lançamentos de perfis diferentes
- [x] CASCADE funciona para filhos de agrupadores
- [x] `recorrencia_id` nunca é duplicado entre séries diferentes

---

## 10. UX/UI

### Dialog de Recorrência
- [ ] Preview claro de quantos serão afetados
- [ ] Highlight na opção selecionada
- [ ] Radio button visual correto
- [ ] Warning amarelo para parcelas já pagas
- [ ] Botão vermelho para exclusão
- [ ] Loading state durante operação
- [ ] Opção "Este e próximos" desabilitada quando apropriado

### Feedback
- [ ] Toast após operação: "X lançamentos atualizados/excluídos"
- [ ] Dashboard recarrega automaticamente
- [ ] Totalizadores atualizados corretamente
- [ ] Indicador visual se afetou outros meses (opcional)

### Acessibilidade
- [ ] Dialog fecha com Escape
- [ ] Foco no primeiro elemento
- [ ] Navegação por teclado nas opções

### Estados
- [ ] Loading enquanto busca infoRecorrencia
- [ ] Loading enquanto executa operação em lote
- [ ] Erro visível se API falhar
- [ ] Botões desabilitados durante loading

---

## 11. CENÁRIOS DE BORDA

### Séries Parcialmente Excluídas
- [x] Criar série de 6 parcelas
- [x] Excluir parcelas 2 e 4 individualmente
- [x] Editar parcela 3 com "este e próximos"
- [x] Verificar: 3, 5, 6 alterados (2, 4 não existem mais)
- [x] Verificar contagem no dialog está correta

### Série com Todos Pagos
- [x] Criar série de 3 parcelas
- [x] Marcar todas como pagas
- [x] Editar com escopo "todos"
- [ ] Verificar warning aparece no dialog (UI)
- [x] Operação conclui normalmente

### Operação no Limite
- [x] Criar série de 60 parcelas (máximo) - 369ms
- [x] Editar primeira parcela com "todos" - 640ms
- [x] Verificar todas 60 alteradas
- [x] Performance aceitável (< 3s) ✓

### Concorrência
- [ ] Abrir mesmo lançamento em duas abas (UI)
- [ ] Editar em uma aba (UI)
- [ ] Tentar editar na outra aba (UI)
- [ ] Comportamento consistente (não corrompe dados)

### Perfis Diferentes
- [x] Criar recorrência no Perfil A
- [x] Trocar para Perfil B (simulado - perfil inválido rejeitado)
- [x] Verificar recorrência não aparece
- [x] Voltar para Perfil A, verificar existe

---

## 12. CHECKLIST PRÉ-DEPLOY

### Backend
- [ ] Migration aplicada em produção
- [ ] Índices criados
- [ ] Rate limits configurados
- [ ] Logs de operação em lote

### Frontend
- [ ] Build sem erros
- [ ] Componentes carregam lazy
- [ ] Sem console.log em produção

### Testes Manuais Obrigatórios
- [ ] Criar recorrência nova
- [ ] Editar com cada escopo
- [ ] Excluir com cada escopo
- [ ] Verificar lançamento legado (sem recorrencia_id)
- [ ] Verificar grupo recorrente com filhos
