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

# Funções de teste
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
echo "TESTES DE LANÇAMENTOS - SEÇÃO 3"
echo "RECORRÊNCIA"
echo "========================================"
echo ""

# Limpar dados de teste (meses 2025-03 a 2026-02)
echo -e "${BLUE}Limpando dados de teste...${NC}"
for MES in "2025-03" "2025-04" "2025-05" "2025-06" "2025-07" "2025-08" "2025-09" "2025-10" "2025-11" "2025-12" "2026-01" "2026-02"; do
  LANCAMENTOS=$(api_call GET "/api/lancamentos?mes=$MES")
  IDS=$(echo "$LANCAMENTOS" | jq -r '.entradas[].id, .saidas[].id' 2>/dev/null)
  for id in $IDS; do
    api_call DELETE "/api/lancamentos/$id?force=true" > /dev/null 2>&1
  done
done
echo -e "${BLUE}Dados limpos.${NC}"
echo ""

# ========================================
# TESTE 3.1: Criar recorrência mensal (12x) - SAÍDA
# ========================================
echo -e "${YELLOW}--- Teste 3.1: Criar recorrência mensal (12x) - SAÍDA ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Aluguel",
  "valor": 2500,
  "mes_inicial": "2025-03",
  "dia_previsto": 5,
  "concluido": false,
  "recorrencia": {
    "tipo": "mensal",
    "quantidade": 12
  }
}')

# API retorna { criados: N }
CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "12 lançamentos criados" "12" "$CRIADOS"

# Buscar primeiro lançamento (março)
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-03" | jq '.saidas[] | select(.nome == "Aluguel")')
NOME=$(echo "$PRIMEIRO" | jq -r '.nome')
MES=$(echo "$PRIMEIRO" | jq -r '.mes')
RECORRENCIA_ID=$(echo "$PRIMEIRO" | jq -r '.recorrencia_id')
VALOR=$(echo "$PRIMEIRO" | jq -r '.valor')

test_case "Nome correto" "Aluguel" "$NOME"
test_case "Primeiro mês correto" "2025-03" "$MES"
test_not_null "recorrencia_id gerado" "$RECORRENCIA_ID"
test_case "Valor correto" "2500" "$VALOR"

# Guardar recorrencia_id para próximos testes
RECORRENCIA_ALUGUEL_ID=$RECORRENCIA_ID

# Verificar último lançamento (fevereiro 2026)
ULTIMO=$(api_call GET "/api/lancamentos?mes=2026-02" | jq '.saidas[] | select(.nome == "Aluguel")')
MES_ULTIMO=$(echo "$ULTIMO" | jq -r '.mes')
RECORRENCIA_ID_ULTIMO=$(echo "$ULTIMO" | jq -r '.recorrencia_id')

test_case "Último mês correto" "2026-02" "$MES_ULTIMO"
test_case "Mesmo recorrencia_id no último" "$RECORRENCIA_ID" "$RECORRENCIA_ID_ULTIMO"

echo ""

# ========================================
# TESTE 3.2: Criar recorrência mensal (12x) - ENTRADA
# ========================================
echo -e "${YELLOW}--- Teste 3.2: Criar recorrência mensal (12x) - ENTRADA ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "entrada",
  "nome": "Salário",
  "valor": 8000,
  "mes_inicial": "2025-03",
  "dia_previsto": 1,
  "concluido": false,
  "recorrencia": {
    "tipo": "mensal",
    "quantidade": 12
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "12 entradas criadas" "12" "$CRIADOS"

# Verificar que é entrada
ENTRADA=$(api_call GET "/api/lancamentos?mes=2025-03" | jq '.entradas[] | select(.nome == "Salário")')
TIPO=$(echo "$ENTRADA" | jq -r '.tipo')
RECORRENCIA_ENTRADA_ID=$(echo "$ENTRADA" | jq -r '.recorrencia_id')

test_case "Tipo entrada" "entrada" "$TIPO"
test_not_null "recorrencia_id entrada" "$RECORRENCIA_ENTRADA_ID"

echo ""

# ========================================
# TESTE 3.3: Criar recorrência parcelada (6x)
# ========================================
echo -e "${YELLOW}--- Teste 3.3: Criar recorrência parcelada (6x) ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Celular",
  "valor": 500,
  "mes_inicial": "2025-03",
  "dia_previsto": 10,
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 6
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "6 parcelas criadas" "6" "$CRIADOS"

# Verificar nomenclatura das parcelas
NOME_1=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .nome')
NOME_2=$(api_call GET "/api/lancamentos?mes=2025-04" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .nome')
NOME_6=$(api_call GET "/api/lancamentos?mes=2025-08" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .nome')

test_case "Nome parcela 1" "Celular (1/6)" "$NOME_1"
test_case "Nome parcela 2" "Celular (2/6)" "$NOME_2"
test_case "Nome parcela 6" "Celular (6/6)" "$NOME_6"

RECORRENCIA_CELULAR_ID=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .recorrencia_id')

echo ""

# ========================================
# TESTE 3.4: Criar parcelas com mínimo (2x)
# ========================================
echo -e "${YELLOW}--- Teste 3.4: Criar parcelas com mínimo (2x) ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Compra Pequena",
  "valor": 100,
  "mes_inicial": "2025-03",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 2
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "2 parcelas criadas (mínimo)" "2" "$CRIADOS"

NOME_1=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome | contains("Compra Pequena")) | .nome')
NOME_2=$(api_call GET "/api/lancamentos?mes=2025-04" | jq -r '.saidas[] | select(.nome | contains("Compra Pequena")) | .nome')

test_case "Nome parcela 1/2" "Compra Pequena (1/2)" "$NOME_1"
test_case "Nome parcela 2/2" "Compra Pequena (2/2)" "$NOME_2"

echo ""

# ========================================
# TESTE 3.5: Verificar cada mês tem lançamento separado
# ========================================
echo -e "${YELLOW}--- Teste 3.5: Verificar distribuição por mês ---${NC}"

# Verificar mês 03
SAIDAS_03=$(api_call GET "/api/lancamentos?mes=2025-03" | jq '[.saidas[] | select(.nome == "Aluguel")] | length')
test_case "1 Aluguel em março" "1" "$SAIDAS_03"

# Verificar mês 06
SAIDAS_06=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '[.saidas[] | select(.nome == "Aluguel")] | length')
test_case "1 Aluguel em junho" "1" "$SAIDAS_06"

# Verificar mês 08 (última parcela do celular)
PARCELA_08=$(api_call GET "/api/lancamentos?mes=2025-08" | jq '[.saidas[] | select(.nome | contains("Celular"))] | length')
test_case "1 parcela Celular em agosto" "1" "$PARCELA_08"

echo ""

# ========================================
# TESTE 3.6: Verificar recorrencia_id igual para toda série
# ========================================
echo -e "${YELLOW}--- Teste 3.6: Verificar recorrencia_id consistente ---${NC}"

ID_03=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome == "Aluguel") | .recorrencia_id')
ID_06=$(api_call GET "/api/lancamentos?mes=2025-06" | jq -r '.saidas[] | select(.nome == "Aluguel") | .recorrencia_id')
ID_12=$(api_call GET "/api/lancamentos?mes=2025-12" | jq -r '.saidas[] | select(.nome == "Aluguel") | .recorrencia_id')

test_case "Março tem recorrencia_id" "$RECORRENCIA_ALUGUEL_ID" "$ID_03"
test_case "Junho tem mesmo recorrencia_id" "$RECORRENCIA_ALUGUEL_ID" "$ID_06"
test_case "Dezembro tem mesmo recorrencia_id" "$RECORRENCIA_ALUGUEL_ID" "$ID_12"

echo ""

# ========================================
# TESTE 3.7: API de info recorrência
# ========================================
echo -e "${YELLOW}--- Teste 3.7: API de info recorrência ---${NC}"

LANCAMENTO_ID=$(api_call GET "/api/lancamentos?mes=2025-05" | jq -r '.saidas[] | select(.nome == "Aluguel") | .id')

RESPONSE=$(api_call GET "/api/lancamentos/$LANCAMENTO_ID/recorrencia")

TOTAL=$(echo "$RESPONSE" | jq -r '.total')
PRIMEIRO_MES=$(echo "$RESPONSE" | jq -r '.primeiroMes')
ULTIMO_MES=$(echo "$RESPONSE" | jq -r '.ultimoMes')
ESCOPO_TODOS=$(echo "$RESPONSE" | jq -r '.contagemPorEscopo.todos')
ESCOPO_ESTE_PROXIMOS=$(echo "$RESPONSE" | jq -r '.contagemPorEscopo.este_e_proximos')

test_case "Total da série" "12" "$TOTAL"
test_case "Primeiro mês" "2025-03" "$PRIMEIRO_MES"
test_case "Último mês" "2026-02" "$ULTIMO_MES"
test_case "Contagem todos" "12" "$ESCOPO_TODOS"
test_case "Contagem este_e_proximos (maio em diante)" "10" "$ESCOPO_ESTE_PROXIMOS"

echo ""

# ========================================
# TESTE 3.8: Grupo recorrente (mensal)
# ========================================
echo -e "${YELLOW}--- Teste 3.8: Grupo recorrente (mensal) ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Cartão Nubank",
  "valor": 0,
  "mes_inicial": "2025-03",
  "concluido": false,
  "is_agrupador": true,
  "valor_modo": "soma",
  "recorrencia": {
    "tipo": "mensal",
    "quantidade": 6
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "6 grupos criados" "6" "$CRIADOS"

# Verificar propriedades do grupo
GRUPO=$(api_call GET "/api/lancamentos?mes=2025-03" | jq '.saidas[] | select(.nome == "Cartão Nubank")')
IS_AGRUPADOR=$(echo "$GRUPO" | jq -r '.is_agrupador')
VALOR_MODO=$(echo "$GRUPO" | jq -r '.valor_modo')
RECORRENCIA_GRUPO_ID=$(echo "$GRUPO" | jq -r '.recorrencia_id')

test_case "is_agrupador true" "true" "$IS_AGRUPADOR"
test_case "valor_modo soma" "soma" "$VALOR_MODO"
test_not_null "recorrencia_id grupo" "$RECORRENCIA_GRUPO_ID"

echo ""

# ========================================
# TESTE 3.9: Nomenclatura mensal vs parcelas
# ========================================
echo -e "${YELLOW}--- Teste 3.9: Nomenclatura mensal vs parcelas ---${NC}"

# Mensal: mesmo nome em todos
NOME_ALUGUEL_03=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome == "Aluguel") | .nome')
NOME_ALUGUEL_06=$(api_call GET "/api/lancamentos?mes=2025-06" | jq -r '.saidas[] | select(.nome == "Aluguel") | .nome')

test_case "Mensal: mesmo nome março" "Aluguel" "$NOME_ALUGUEL_03"
test_case "Mensal: mesmo nome junho" "Aluguel" "$NOME_ALUGUEL_06"

# Parcelas: nome com (X/N)
NOME_CELULAR_03=$(api_call GET "/api/lancamentos?mes=2025-03" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .nome')
NOME_CELULAR_06=$(api_call GET "/api/lancamentos?mes=2025-06" | jq -r '.saidas[] | select(.nome | contains("Celular")) | .nome')

test_case "Parcela março" "Celular (1/6)" "$NOME_CELULAR_03"
test_case "Parcela junho" "Celular (4/6)" "$NOME_CELULAR_06"

echo ""

# ========================================
# LIMPEZA FINAL
# ========================================
echo -e "${BLUE}Limpando dados de teste...${NC}"
for MES in "2025-03" "2025-04" "2025-05" "2025-06" "2025-07" "2025-08" "2025-09" "2025-10" "2025-11" "2025-12" "2026-01" "2026-02"; do
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
echo "RESUMO DOS TESTES - SEÇÃO 3"
echo "========================================"
echo -e "Passou: ${GREEN}$PASSED${NC}"
echo -e "Falhou: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}SEÇÃO 3 COMPLETA - Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}SEÇÃO 3 INCOMPLETA - Alguns testes falharam.${NC}"
  exit 1
fi
