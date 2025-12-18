#!/bin/bash

# Configurações
TOKEN="13b85a24731fa3779eedd0679984c08b59478463b534f4803775b54d87ad4b24"
PERFIL_ID="4564c3c0-df80-4f52-bced-ecb17ea06104"
API_URL="http://localhost:3333"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contadores
PASSED=0
FAILED=0

# Função para fazer requisições
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$data" ]; then
    curl -s -X "$method" "${API_URL}${endpoint}" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-perfil-id: $PERFIL_ID" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "${API_URL}${endpoint}" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-perfil-id: $PERFIL_ID"
  fi
}

# Função para testar
test_case() {
  local name=$1
  local expected=$2
  local actual=$3

  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $name"
    echo -e "  Expected: $expected"
    echo -e "  Actual: $actual"
    ((FAILED++))
    return 1
  fi
}

test_not_null() {
  local name=$1
  local actual=$2

  if [ -n "$actual" ] && [ "$actual" != "null" ] && [ "$actual" != "" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $name"
    echo -e "  Expected: non-null value"
    echo -e "  Actual: $actual"
    ((FAILED++))
    return 1
  fi
}

echo "========================================"
echo "TESTES DE LANÇAMENTOS - SEÇÃO 4"
echo "EDITAR RECORRÊNCIA EM LOTE"
echo "========================================"
echo ""

# ========================================
# LIMPEZA INICIAL
# ========================================
echo -e "${BLUE}Limpando dados de teste dos meses 2025-04 a 2025-09...${NC}"
for MES in "2025-04" "2025-05" "2025-06" "2025-07" "2025-08" "2025-09"; do
  LANCAMENTOS=$(api_call GET "/api/lancamentos?mes=$MES")
  IDS=$(echo "$LANCAMENTOS" | jq -r '.entradas[].id, .saidas[].id' 2>/dev/null)
  for id in $IDS; do
    api_call DELETE "/api/lancamentos/$id?force=true" > /dev/null 2>&1
  done
done
echo -e "${BLUE}Dados limpos.${NC}"
echo ""

# ========================================
# TESTE 4.1: Criar recorrência para teste
# ========================================
echo -e "${YELLOW}--- Teste 4.1: Criar recorrência de 6 parcelas para teste ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Edição",
  "valor": 500,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 6
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 6 lançamentos" "6" "$CRIADOS"

# Buscar primeiro lançamento para pegar recorrencia_id
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
RECORRENCIA_ID=$(echo "$PRIMEIRO" | jq -r '.recorrencia_id')

test_not_null "Primeiro ID existe" "$PRIMEIRO_ID"
test_not_null "Recorrencia ID existe" "$RECORRENCIA_ID"

echo ""

# ========================================
# TESTE 4.2: API de info recorrência
# ========================================
echo -e "${YELLOW}--- Teste 4.2: API de info recorrência ---${NC}"

INFO=$(api_call GET "/api/lancamentos/$PRIMEIRO_ID/recorrencia")
TOTAL=$(echo "$INFO" | jq -r '.total')
REC_ID=$(echo "$INFO" | jq -r '.recorrenciaId')
PRIMEIRO_MES=$(echo "$INFO" | jq -r '.primeiroMes')
ULTIMO_MES=$(echo "$INFO" | jq -r '.ultimoMes')
CONTAGEM_TODOS=$(echo "$INFO" | jq -r '.contagemPorEscopo.todos')

test_case "Total série" "6" "$TOTAL"
test_not_null "Recorrencia ID existe" "$REC_ID"
test_case "Primeiro mês 2025-04" "2025-04" "$PRIMEIRO_MES"
test_case "Último mês 2025-09" "2025-09" "$ULTIMO_MES"
test_case "Contagem todos = 6" "6" "$CONTAGEM_TODOS"

echo ""

# ========================================
# TESTE 4.3: Editar apenas este (nome)
# ========================================
echo -e "${YELLOW}--- Teste 4.3: Editar apenas este (nome) ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$PRIMEIRO_ID/recorrencia" '{
  "escopo": "apenas_este",
  "dados": {
    "nome": "Apenas Este Editado (1/6)"
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 1 lançamento" "1" "$ATUALIZADOS"

# Verificar que o nome mudou no primeiro
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.id == "'$PRIMEIRO_ID'")')
NOME=$(echo "$PRIMEIRO" | jq -r '.nome')
test_case "Nome editado" "Apenas Este Editado (1/6)" "$NOME"

# Verificar que o segundo permanece com nome original
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
SEGUNDO_NOME=$(echo "$SEGUNDO" | jq -r '.nome')
test_case "Segundo inalterado" "Teste Edição (2/6)" "$SEGUNDO_NOME"

echo ""

# ========================================
# TESTE 4.4: Editar apenas este (valor)
# ========================================
echo -e "${YELLOW}--- Teste 4.4: Editar apenas este (valor) ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$PRIMEIRO_ID/recorrencia" '{
  "escopo": "apenas_este",
  "dados": {
    "valor": 550
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 1 lançamento" "1" "$ATUALIZADOS"

# Verificar valor do primeiro
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.id == "'$PRIMEIRO_ID'")')
VALOR=$(echo "$PRIMEIRO" | jq -r '.valor')
test_case "Valor primeiro 550" "550" "$VALOR"

# Verificar que o segundo permanece com valor original
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
SEGUNDO_VALOR=$(echo "$SEGUNDO" | jq -r '.valor')
test_case "Segundo inalterado 500" "500" "$SEGUNDO_VALOR"

echo ""

# ========================================
# TESTE 4.5: Editar este e próximos (valor)
# ========================================
echo -e "${YELLOW}--- Teste 4.5: Editar este e próximos (valor) ---${NC}"

# Buscar terceiro lançamento
TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')

RESPONSE=$(api_call PUT "/api/lancamentos/$TERCEIRO_ID/recorrencia" '{
  "escopo": "este_e_proximos",
  "dados": {
    "valor": 600
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 4 lançamentos (3 ao 6)" "4" "$ATUALIZADOS"

# Verificar que meses 1 e 2 permanecem inalterados
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.id == "'$PRIMEIRO_ID'")')
PRIMEIRO_VALOR=$(echo "$PRIMEIRO" | jq -r '.valor')
test_case "Primeiro manteve 550" "550" "$PRIMEIRO_VALOR"

SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
SEGUNDO_VALOR=$(echo "$SEGUNDO" | jq -r '.valor')
test_case "Segundo manteve 500" "500" "$SEGUNDO_VALOR"

# Verificar que meses 3 a 6 foram alterados
for MES_NUM in 6 7 8 9; do
  MES="2025-0$MES_NUM"
  LANC=$(api_call GET "/api/lancamentos?mes=$MES" | jq '.saidas[] | select(.nome | contains("Teste Edição") or contains("Apenas Este"))')
  LANC_VALOR=$(echo "$LANC" | jq -r '.valor')
  test_case "Mês $MES valor 600" "600" "$LANC_VALOR"
done

echo ""

# ========================================
# TESTE 4.6: Editar todos (nome)
# ========================================
echo -e "${YELLOW}--- Teste 4.6: Editar todos (nome) ---${NC}"

# Usar quarto lançamento
QUARTO=$(api_call GET "/api/lancamentos?mes=2025-07" | jq '.saidas[] | select(.nome | contains("Teste Edição"))')
QUARTO_ID=$(echo "$QUARTO" | jq -r '.id')

RESPONSE=$(api_call PUT "/api/lancamentos/$QUARTO_ID/recorrencia" '{
  "escopo": "todos",
  "dados": {
    "nome": "Nome Todos"
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 6 lançamentos" "6" "$ATUALIZADOS"

# Verificar que todos os nomes mudaram (API aplica nome exatamente como enviado)
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.id == "'$PRIMEIRO_ID'")')
PRIMEIRO_NOME=$(echo "$PRIMEIRO" | jq -r '.nome')
test_case "Primeiro nome Nome Todos" "Nome Todos" "$PRIMEIRO_NOME"

SEXTO=$(api_call GET "/api/lancamentos?mes=2025-09" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
SEXTO_NOME=$(echo "$SEXTO" | jq -r '.nome')
test_case "Sexto nome Nome Todos" "Nome Todos" "$SEXTO_NOME"

echo ""

# ========================================
# TESTE 4.7: Editar todos (valor) - overwrite
# ========================================
echo -e "${YELLOW}--- Teste 4.7: Editar todos (valor) ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$PRIMEIRO_ID/recorrencia" '{
  "escopo": "todos",
  "dados": {
    "valor": 1000
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 6 lançamentos" "6" "$ATUALIZADOS"

# Verificar todos os valores
for MES_NUM in 4 5 6 7 8 9; do
  MES="2025-0$MES_NUM"
  LANC=$(api_call GET "/api/lancamentos?mes=$MES" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
  LANC_VALOR=$(echo "$LANC" | jq -r '.valor')
  test_case "Mês $MES valor 1000" "1000" "$LANC_VALOR"
done

echo ""

# ========================================
# TESTE 4.8: Toggle concluído em lote
# ========================================
echo -e "${YELLOW}--- Teste 4.8: Toggle concluído em lote ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$PRIMEIRO_ID/recorrencia" '{
  "escopo": "este_e_proximos",
  "dados": {
    "concluido": true
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 6 lançamentos" "6" "$ATUALIZADOS"

# Verificar que todos ficaram concluídos
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.id == "'$PRIMEIRO_ID'")')
PRIMEIRO_CONCLUIDO=$(echo "$PRIMEIRO" | jq -r '.concluido')
test_case "Primeiro concluído" "true" "$PRIMEIRO_CONCLUIDO"

echo ""

# ========================================
# TESTE 4.9: Edge case - último da série
# ========================================
echo -e "${YELLOW}--- Teste 4.9: Edge case - último da série ---${NC}"

# Buscar último lançamento
ULTIMO=$(api_call GET "/api/lancamentos?mes=2025-09" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
ULTIMO_ID=$(echo "$ULTIMO" | jq -r '.id')

# Usar "este_e_proximos" no último - deve afetar só 1
RESPONSE=$(api_call PUT "/api/lancamentos/$ULTIMO_ID/recorrencia" '{
  "escopo": "este_e_proximos",
  "dados": {
    "valor": 1500
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Este e próximos no último atualiza só 1" "1" "$ATUALIZADOS"

# Verificar que o penúltimo não mudou
PENULTIMO=$(api_call GET "/api/lancamentos?mes=2025-08" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
PENULTIMO_VALOR=$(echo "$PENULTIMO" | jq -r '.valor')
test_case "Penúltimo manteve 1000" "1000" "$PENULTIMO_VALOR"

# Verificar que último mudou
ULTIMO=$(api_call GET "/api/lancamentos?mes=2025-09" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
ULTIMO_VALOR=$(echo "$ULTIMO" | jq -r '.valor')
test_case "Último mudou para 1500" "1500" "$ULTIMO_VALOR"

echo ""

# ========================================
# TESTE 4.10: Info recorrência mostra contagem correta
# ========================================
echo -e "${YELLOW}--- Teste 4.10: Info recorrência contagem correta ---${NC}"

# Buscar terceiro
TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Nome Todos"))')
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')

INFO=$(api_call GET "/api/lancamentos/$TERCEIRO_ID/recorrencia")
MES_ATUAL=$(echo "$INFO" | jq -r '.mesAtual')
CONTAGEM_ETE_PROXIMOS=$(echo "$INFO" | jq -r '.contagemPorEscopo.este_e_proximos')

test_case "Mês atual 2025-06" "2025-06" "$MES_ATUAL"
test_case "Contagem este_e_proximos 4" "4" "$CONTAGEM_ETE_PROXIMOS"

echo ""

# ========================================
# TESTE 4.11: Lançamento legado sem recorrencia_id
# ========================================
echo -e "${YELLOW}--- Teste 4.11: Lançamento legado (sem recorrencia_id) ---${NC}"

# Criar lançamento simples (sem recorrência)
RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Legado Simples",
  "valor": 200,
  "mes": "2025-04",
  "concluido": false
}')

LEGADO=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Legado Simples")')
LEGADO_ID=$(echo "$LEGADO" | jq -r '.id')
test_not_null "Lançamento legado criado" "$LEGADO_ID"

# Verificar que recorrencia_id é null
LEGADO_REC_ID=$(echo "$LEGADO" | jq -r '.recorrencia_id')
test_case "Recorrencia ID null" "null" "$LEGADO_REC_ID"

# Info recorrencia retorna recorrenciaId null mas total 1 (só ele mesmo)
INFO=$(api_call GET "/api/lancamentos/$LEGADO_ID/recorrencia")
REC_ID=$(echo "$INFO" | jq -r '.recorrenciaId')
TOTAL=$(echo "$INFO" | jq -r '.total')
test_case "Recorrencia ID é null" "null" "$REC_ID"
test_case "Total é 1 (ele mesmo)" "1" "$TOTAL"

echo ""

# ========================================
# TESTE 4.12: Criar ENTRADA recorrente e editar
# ========================================
echo -e "${YELLOW}--- Teste 4.12: Editar ENTRADA recorrente ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "entrada",
  "nome": "Salário Teste",
  "valor": 5000,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "mensal",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 entradas" "3" "$CRIADOS"

# Buscar primeira entrada
ENTRADA1=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.entradas[] | select(.nome == "Salário Teste")')
ENTRADA1_ID=$(echo "$ENTRADA1" | jq -r '.id')
test_not_null "Entrada ID existe" "$ENTRADA1_ID"

# Editar todos
RESPONSE=$(api_call PUT "/api/lancamentos/$ENTRADA1_ID/recorrencia" '{
  "escopo": "todos",
  "dados": {
    "valor": 5500
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 3 entradas" "3" "$ATUALIZADOS"

# Verificar valor atualizado
ENTRADA1=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.entradas[] | select(.nome == "Salário Teste")')
ENTRADA1_VALOR=$(echo "$ENTRADA1" | jq -r '.valor')
test_case "Entrada valor 5500" "5500" "$ENTRADA1_VALOR"

echo ""

# ========================================
# TESTE 4.13: Série parcialmente excluída
# ========================================
echo -e "${YELLOW}--- Teste 4.13: Editar série parcialmente excluída ---${NC}"

# Criar nova série
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Parcial Teste",
  "valor": 300,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 4
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 4 lançamentos" "4" "$CRIADOS"

# Excluir o segundo (2025-05) individualmente
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Parcial Teste"))')
SEGUNDO_ID=$(echo "$SEGUNDO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$SEGUNDO_ID" > /dev/null

# Verificar que foi excluído
SEGUNDO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Parcial Teste"))')
test_case "Segundo foi excluído" "" "$SEGUNDO_CHECK"

# Editar terceiro com "este e próximos" - deve afetar apenas 3 e 4
TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Parcial Teste"))')
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')

RESPONSE=$(api_call PUT "/api/lancamentos/$TERCEIRO_ID/recorrencia" '{
  "escopo": "este_e_proximos",
  "dados": {
    "valor": 350
  }
}')

ATUALIZADOS=$(echo "$RESPONSE" | jq -r '.atualizados')
test_case "Atualizou 2 lançamentos (3 e 4)" "2" "$ATUALIZADOS"

# Verificar primeiro manteve valor original
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Parcial Teste"))')
PRIMEIRO_VALOR=$(echo "$PRIMEIRO" | jq -r '.valor')
test_case "Primeiro manteve 300" "300" "$PRIMEIRO_VALOR"

# Verificar terceiro e quarto mudaram
TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Parcial Teste"))')
TERCEIRO_VALOR=$(echo "$TERCEIRO" | jq -r '.valor')
test_case "Terceiro mudou para 350" "350" "$TERCEIRO_VALOR"

echo ""

# ========================================
# LIMPEZA FINAL
# ========================================
echo -e "${BLUE}Limpando dados de teste...${NC}"
for MES in "2025-04" "2025-05" "2025-06" "2025-07" "2025-08" "2025-09"; do
  LANCAMENTOS=$(api_call GET "/api/lancamentos?mes=$MES")
  IDS=$(echo "$LANCAMENTOS" | jq -r '.entradas[].id, .saidas[].id' 2>/dev/null)
  for id in $IDS; do
    api_call DELETE "/api/lancamentos/$id?force=true" > /dev/null 2>&1
  done
done
echo -e "${BLUE}Limpeza concluída.${NC}"

# ========================================
# RESUMO
# ========================================
echo ""
echo "========================================"
echo "RESUMO DOS TESTES - SEÇÃO 4"
echo "========================================"
echo -e "Passou: ${GREEN}$PASSED${NC}"
echo -e "Falhou: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}SEÇÃO 4 COMPLETA - Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}SEÇÃO 4 INCOMPLETA - Alguns testes falharam.${NC}"
  exit 1
fi
