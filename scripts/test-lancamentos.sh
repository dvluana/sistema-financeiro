#!/bin/bash

# Configurações
TOKEN="13b85a24731fa3779eedd0679984c08b59478463b534f4803775b54d87ad4b24"
PERFIL_ID="4564c3c0-df80-4f52-bced-ecb17ea06104"
API_URL="http://localhost:3333"
MES="2025-01"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Função para testar não nulo
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
echo "TESTES DE LANÇAMENTOS - SEÇÃO 1"
echo "========================================"
echo ""

# Limpar lançamentos de teste existentes (mês 2025-01)
echo -e "${BLUE}Limpando dados de teste do mês $MES...${NC}"
LANCAMENTOS=$(api_call GET "/api/lancamentos?mes=$MES")
IDS=$(echo "$LANCAMENTOS" | jq -r '.entradas[].id, .saidas[].id' 2>/dev/null)
for id in $IDS; do
  api_call DELETE "/api/lancamentos/$id" > /dev/null 2>&1
done
echo -e "${BLUE}Dados limpos.${NC}"
echo ""

# ========================================
# TESTE 1.1: Criar entrada sem categoria
# ========================================
echo -e "${YELLOW}--- Teste 1.1: Criar entrada sem categoria ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "entrada",
  "nome": "Salário Teste",
  "valor": 5000,
  "mes": "2025-01",
  "concluido": false
}')

# A API retorna a lista completa - buscar o item criado
CREATED=$(echo "$RESPONSE" | jq '.entradas[] | select(.nome == "Salário Teste")')
ID=$(echo "$CREATED" | jq -r '.id')
NOME=$(echo "$CREATED" | jq -r '.nome')
TIPO=$(echo "$CREATED" | jq -r '.tipo')
VALOR=$(echo "$CREATED" | jq -r '.valor')
CATEGORIA=$(echo "$CREATED" | jq -r '.categoria_id')

test_not_null "ID retornado" "$ID"
test_case "Nome correto" "Salário Teste" "$NOME"
test_case "Tipo correto" "entrada" "$TIPO"
test_case "Valor correto" "5000" "$VALOR"
test_case "Sem categoria" "null" "$CATEGORIA"

ENTRADA_ID=$ID
echo ""

# ========================================
# TESTE 1.2: Criar saída sem categoria
# ========================================
echo -e "${YELLOW}--- Teste 1.2: Criar saída sem categoria ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Aluguel Teste",
  "valor": 2500,
  "mes": "2025-01",
  "concluido": false
}')

CREATED=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Aluguel Teste")')
ID=$(echo "$CREATED" | jq -r '.id')
TIPO=$(echo "$CREATED" | jq -r '.tipo')
VALOR=$(echo "$CREATED" | jq -r '.valor')

test_not_null "ID retornado" "$ID"
test_case "Tipo saída" "saida" "$TIPO"
test_case "Valor 2500" "2500" "$VALOR"

SAIDA_ID=$ID
echo ""

# ========================================
# TESTE 1.3: Criar com categoria existente
# ========================================
echo -e "${YELLOW}--- Teste 1.3: Criar com categoria existente ---${NC}"

# Primeiro criar uma categoria (precisa de tipo)
CAT_RESPONSE=$(api_call POST "/api/categorias" '{
  "nome": "Categoria Teste",
  "cor": "#ff0000",
  "tipo": "saida"
}')
CAT_ID=$(echo "$CAT_RESPONSE" | jq -r '.id')

if [ "$CAT_ID" = "null" ] || [ -z "$CAT_ID" ]; then
  # Categoria pode já existir - buscar
  CAT_LIST=$(api_call GET "/api/categorias")
  CAT_ID=$(echo "$CAT_LIST" | jq -r '.[] | select(.nome == "Categoria Teste") | .id')
fi

test_not_null "Categoria criada" "$CAT_ID"

RESPONSE=$(api_call POST "/api/lancamentos" "{
  \"tipo\": \"saida\",
  \"nome\": \"Com Categoria\",
  \"valor\": 100,
  \"mes\": \"2025-01\",
  \"concluido\": false,
  \"categoria_id\": \"$CAT_ID\"
}")

CREATED=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Com Categoria")')
ID=$(echo "$CREATED" | jq -r '.id')
CATEGORIA_ID=$(echo "$CREATED" | jq -r '.categoria_id')

test_not_null "Lançamento criado" "$ID"
test_case "Categoria associada" "$CAT_ID" "$CATEGORIA_ID"

COM_CAT_ID=$ID
echo ""

# ========================================
# TESTE 1.4: Criar com data de pagamento
# ========================================
echo -e "${YELLOW}--- Teste 1.4: Criar com data de pagamento ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "entrada",
  "nome": "Com Data Prevista",
  "valor": 1000,
  "mes": "2025-01",
  "concluido": false,
  "data_prevista": "2025-01-15"
}')

CREATED=$(echo "$RESPONSE" | jq '.entradas[] | select(.nome == "Com Data Prevista")')
ID=$(echo "$CREATED" | jq -r '.id')
DATA_PREVISTA=$(echo "$CREATED" | jq -r '.data_prevista')

test_not_null "Lançamento criado" "$ID"
test_case "Data prevista correta" "2025-01-15" "$DATA_PREVISTA"

DATA_ID=$ID
echo ""

# ========================================
# TESTE 1.5: Criar marcado como pago/recebido
# ========================================
echo -e "${YELLOW}--- Teste 1.5: Criar marcado como pago/recebido ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "entrada",
  "nome": "Já Recebido",
  "valor": 500,
  "mes": "2025-01",
  "concluido": true
}')

CREATED=$(echo "$RESPONSE" | jq '.entradas[] | select(.nome == "Já Recebido")')
ID=$(echo "$CREATED" | jq -r '.id')
CONCLUIDO=$(echo "$CREATED" | jq -r '.concluido')

test_not_null "Lançamento criado" "$ID"
test_case "Concluído true" "true" "$CONCLUIDO"

CONCLUIDO_ID=$ID
echo ""

# ========================================
# TESTE 1.6: Criar com valor decimal
# ========================================
echo -e "${YELLOW}--- Teste 1.6: Criar com valor decimal ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Valor Decimal",
  "valor": 1234.56,
  "mes": "2025-01",
  "concluido": false
}')

CREATED=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Valor Decimal")')
ID=$(echo "$CREATED" | jq -r '.id')
VALOR=$(echo "$CREATED" | jq -r '.valor')

test_not_null "Lançamento criado" "$ID"
test_case "Valor decimal" "1234.56" "$VALOR"

DECIMAL_ID=$ID
echo ""

# ========================================
# TESTE 1.7: Verificar totalizadores
# ========================================
echo -e "${YELLOW}--- Teste 1.7: Verificar totalizadores ---${NC}"

RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")

TOTAL_ENTRADAS=$(echo "$RESPONSE" | jq -r '.totais.entradas')
TOTAL_SAIDAS=$(echo "$RESPONSE" | jq -r '.totais.saidas')
JA_ENTROU=$(echo "$RESPONSE" | jq -r '.totais.jaEntrou')
SALDO=$(echo "$RESPONSE" | jq -r '.totais.saldo')

# Esperado: entradas = 5000 + 1000 + 500 = 6500
# Esperado: saidas = 2500 + 100 + 1234.56 = 3834.56
# Esperado: saldo = 6500 - 3834.56 = 2665.44
test_case "Total entradas" "6500" "$TOTAL_ENTRADAS"
test_case "Total saídas" "3834.56" "$TOTAL_SAIDAS"
test_case "Já entrou (concluídos)" "500" "$JA_ENTROU"
test_case "Saldo correto" "2665.44" "$SALDO"

echo ""

# ========================================
# LIMPEZA FINAL
# ========================================
echo -e "${BLUE}Limpando lançamentos criados...${NC}"
for id in $ENTRADA_ID $SAIDA_ID $COM_CAT_ID $DATA_ID $CONCLUIDO_ID $DECIMAL_ID; do
  api_call DELETE "/api/lancamentos/$id" > /dev/null 2>&1
done

# Limpar categoria
if [ -n "$CAT_ID" ]; then
  api_call DELETE "/api/categorias/$CAT_ID" > /dev/null 2>&1
fi
echo -e "${BLUE}Limpeza concluída.${NC}"

# ========================================
# RESUMO
# ========================================
echo ""
echo "========================================"
echo "RESUMO DOS TESTES - SEÇÃO 1"
echo "========================================"
echo -e "Passou: ${GREEN}$PASSED${NC}"
echo -e "Falhou: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}SEÇÃO 1 COMPLETA - Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}SEÇÃO 1 INCOMPLETA - Alguns testes falharam.${NC}"
  exit 1
fi
