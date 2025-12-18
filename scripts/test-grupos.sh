#!/bin/bash

# Configurações
TOKEN="13b85a24731fa3779eedd0679984c08b59478463b534f4803775b54d87ad4b24"
PERFIL_ID="4564c3c0-df80-4f52-bced-ecb17ea06104"
API_URL="http://localhost:3333"
MES="2025-02"

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
echo "TESTES DE LANÇAMENTOS - SEÇÃO 2"
echo "GRUPOS (AGRUPADORES)"
echo "========================================"
echo ""

# Limpar dados de teste
echo -e "${BLUE}Limpando dados de teste do mês $MES...${NC}"
LANCAMENTOS=$(api_call GET "/api/lancamentos?mes=$MES")
IDS=$(echo "$LANCAMENTOS" | jq -r '.entradas[].id, .saidas[].id' 2>/dev/null)
for id in $IDS; do
  api_call DELETE "/api/lancamentos/$id?force=true" > /dev/null 2>&1
done
echo -e "${BLUE}Dados limpos.${NC}"
echo ""

# ========================================
# TESTE 2.1: Criar grupo modo SOMA
# ========================================
echo -e "${YELLOW}--- Teste 2.1: Criar grupo modo SOMA ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Cartão Nubank",
  "valor": 0,
  "mes": "2025-02",
  "concluido": false,
  "is_agrupador": true,
  "valor_modo": "soma"
}')

CREATED=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Cartão Nubank")')
GRUPO_SOMA_ID=$(echo "$CREATED" | jq -r '.id')
IS_AGRUPADOR=$(echo "$CREATED" | jq -r '.is_agrupador')
VALOR_MODO=$(echo "$CREATED" | jq -r '.valor_modo')
VALOR=$(echo "$CREATED" | jq -r '.valor')
VALOR_CALCULADO=$(echo "$CREATED" | jq -r '.valor_calculado')

test_not_null "Grupo criado" "$GRUPO_SOMA_ID"
test_case "is_agrupador true" "true" "$IS_AGRUPADOR"
test_case "valor_modo soma" "soma" "$VALOR_MODO"
test_case "valor inicial 0" "0" "$VALOR"
test_case "valor_calculado 0" "0" "$VALOR_CALCULADO"

echo ""

# ========================================
# TESTE 2.2: Criar grupo modo FIXO
# ========================================
echo -e "${YELLOW}--- Teste 2.2: Criar grupo modo FIXO ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Cartão Itaú",
  "valor": 1500,
  "mes": "2025-02",
  "concluido": false,
  "is_agrupador": true,
  "valor_modo": "fixo"
}')

CREATED=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Cartão Itaú")')
GRUPO_FIXO_ID=$(echo "$CREATED" | jq -r '.id')
IS_AGRUPADOR=$(echo "$CREATED" | jq -r '.is_agrupador')
VALOR_MODO=$(echo "$CREATED" | jq -r '.valor_modo')
VALOR=$(echo "$CREATED" | jq -r '.valor')
VALOR_CALCULADO=$(echo "$CREATED" | jq -r '.valor_calculado')

test_not_null "Grupo criado" "$GRUPO_FIXO_ID"
test_case "is_agrupador true" "true" "$IS_AGRUPADOR"
test_case "valor_modo fixo" "fixo" "$VALOR_MODO"
test_case "valor 1500" "1500" "$VALOR"
test_case "valor_calculado 1500" "1500" "$VALOR_CALCULADO"

echo ""

# ========================================
# TESTE 2.3: Criar grupo de entrada
# ========================================
echo -e "${YELLOW}--- Teste 2.3: Criar grupo de entrada ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "entrada",
  "nome": "Freelances",
  "valor": 0,
  "mes": "2025-02",
  "concluido": false,
  "is_agrupador": true,
  "valor_modo": "soma"
}')

CREATED=$(echo "$RESPONSE" | jq '.entradas[] | select(.nome == "Freelances")')
GRUPO_ENTRADA_ID=$(echo "$CREATED" | jq -r '.id')
TIPO=$(echo "$CREATED" | jq -r '.tipo')
IS_AGRUPADOR=$(echo "$CREATED" | jq -r '.is_agrupador')

test_not_null "Grupo entrada criado" "$GRUPO_ENTRADA_ID"
test_case "Tipo entrada" "entrada" "$TIPO"
test_case "is_agrupador true" "true" "$IS_AGRUPADOR"

echo ""

# ========================================
# TESTE 2.4: Adicionar filho ao grupo SOMA
# ========================================
echo -e "${YELLOW}--- Teste 2.4: Adicionar filho ao grupo SOMA ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/$GRUPO_SOMA_ID/filhos" '{
  "tipo": "saida",
  "nome": "Netflix",
  "valor": 55.90,
  "concluido": false
}')

# API retorna a lista completa - filho está dentro do agrupador.filhos
FILHO1_ID=$(echo "$RESPONSE" | jq -r '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'") | .filhos[] | select(.nome == "Netflix") | .id')
PARENT_ID=$(echo "$RESPONSE" | jq -r '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'") | .filhos[] | select(.nome == "Netflix") | .parent_id')

test_not_null "Filho criado" "$FILHO1_ID"
test_case "Parent correto" "$GRUPO_SOMA_ID" "$PARENT_ID"

# Adicionar segundo filho
RESPONSE=$(api_call POST "/api/lancamentos/$GRUPO_SOMA_ID/filhos" '{
  "tipo": "saida",
  "nome": "Spotify",
  "valor": 21.90,
  "concluido": false
}')

FILHO2_ID=$(echo "$RESPONSE" | jq -r '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'") | .filhos[] | select(.nome == "Spotify") | .id')
test_not_null "Segundo filho criado" "$FILHO2_ID"

echo ""

# ========================================
# TESTE 2.5: Verificar soma do grupo
# ========================================
echo -e "${YELLOW}--- Teste 2.5: Verificar soma do grupo ---${NC}"

RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")

# Buscar o grupo e verificar valor_calculado
GRUPO=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'")')
VALOR_CALCULADO=$(echo "$GRUPO" | jq -r '.valor_calculado')

# Esperado: 55.90 + 21.90 = 77.80
test_case "Soma filhos 77.80" "77.8" "$VALOR_CALCULADO"

echo ""

# ========================================
# TESTE 2.6: Adicionar filho ao grupo FIXO
# ========================================
echo -e "${YELLOW}--- Teste 2.6: Adicionar filho ao grupo FIXO ---${NC}"

RESPONSE=$(api_call POST "/api/lancamentos/$GRUPO_FIXO_ID/filhos" '{
  "tipo": "saida",
  "nome": "Compra Loja X",
  "valor": 200,
  "concluido": false
}')

# API retorna lista completa - buscar filho dentro do agrupador
FILHO_FIXO_ID=$(echo "$RESPONSE" | jq -r '.saidas[] | select(.id == "'$GRUPO_FIXO_ID'") | .filhos[] | select(.nome == "Compra Loja X") | .id')
test_not_null "Filho do grupo fixo criado" "$FILHO_FIXO_ID"

# Verificar que valor_calculado do grupo FIXO permanece 1500 (não soma)
RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")
GRUPO_FIXO=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_FIXO_ID'")')
VALOR_CALCULADO=$(echo "$GRUPO_FIXO" | jq -r '.valor_calculado')

test_case "Grupo fixo mantém valor" "1500" "$VALOR_CALCULADO"

echo ""

# ========================================
# TESTE 2.7: Listar filhos do grupo
# ========================================
echo -e "${YELLOW}--- Teste 2.7: Listar filhos do grupo ---${NC}"

RESPONSE=$(api_call GET "/api/lancamentos/$GRUPO_SOMA_ID/filhos")
COUNT=$(echo "$RESPONSE" | jq 'length')

test_case "Dois filhos no grupo" "2" "$COUNT"

echo ""

# ========================================
# TESTE 2.8: Editar nome do grupo
# ========================================
echo -e "${YELLOW}--- Teste 2.8: Editar nome do grupo ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$GRUPO_SOMA_ID" '{
  "nome": "Nubank Editado"
}')

GRUPO=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'")')
NOME=$(echo "$GRUPO" | jq -r '.nome')

test_case "Nome editado" "Nubank Editado" "$NOME"

echo ""

# ========================================
# TESTE 2.9: Editar filho
# ========================================
echo -e "${YELLOW}--- Teste 2.9: Editar filho ---${NC}"

RESPONSE=$(api_call PUT "/api/lancamentos/$FILHO1_ID" '{
  "valor": 65.90
}')

# Verificar que a soma atualizou
RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")
GRUPO=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'")')
VALOR_CALCULADO=$(echo "$GRUPO" | jq -r '.valor_calculado')

# Esperado: 65.90 + 21.90 = 87.80 (com tolerância para ponto flutuante)
# Arredondar para 2 casas decimais
VALOR_ROUNDED=$(printf "%.2f" "$VALOR_CALCULADO" 2>/dev/null || echo "$VALOR_CALCULADO")
test_case "Soma atualizada após edição" "87.80" "$VALOR_ROUNDED"

echo ""

# ========================================
# TESTE 2.10: Excluir filho individual
# ========================================
echo -e "${YELLOW}--- Teste 2.10: Excluir filho individual ---${NC}"

api_call DELETE "/api/lancamentos/$FILHO2_ID" > /dev/null

# Verificar que a soma atualizou
RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")
GRUPO=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'")')
VALOR_CALCULADO=$(echo "$GRUPO" | jq -r '.valor_calculado')

# Esperado: apenas 65.90
test_case "Soma após excluir filho" "65.9" "$VALOR_CALCULADO"

echo ""

# ========================================
# TESTE 2.11: Excluir grupo sem forçar (tem filhos)
# ========================================
echo -e "${YELLOW}--- Teste 2.11: Excluir grupo com filhos (sem force) ---${NC}"

RESPONSE=$(api_call DELETE "/api/lancamentos/$GRUPO_SOMA_ID")
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
REQUIRES_CONFIRM=$(echo "$RESPONSE" | jq -r '.requiresConfirmation // empty')

# Deve retornar erro pedindo confirmação
if [ -n "$ERROR" ] && [ -n "$REQUIRES_CONFIRM" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Pede confirmação para excluir grupo com filhos"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Deveria pedir confirmação"
  echo "  Response: $RESPONSE"
  ((FAILED++))
fi

echo ""

# ========================================
# TESTE 2.12: Excluir grupo com force=true
# ========================================
echo -e "${YELLOW}--- Teste 2.12: Excluir grupo com filhos (force=true) ---${NC}"

api_call DELETE "/api/lancamentos/$GRUPO_SOMA_ID?force=true" > /dev/null

# Verificar que o grupo foi excluído
RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")
GRUPO_EXISTS=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_SOMA_ID'") | .id')

if [ -z "$GRUPO_EXISTS" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Grupo excluído com force=true"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Grupo não foi excluído"
  ((FAILED++))
fi

# Verificar que filhos também foram excluídos
FILHO_EXISTS=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$FILHO1_ID'") | .id')
if [ -z "$FILHO_EXISTS" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Filhos excluídos em cascata"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Filhos não foram excluídos"
  ((FAILED++))
fi

echo ""

# ========================================
# TESTE 2.13: Excluir grupo sem filhos
# ========================================
echo -e "${YELLOW}--- Teste 2.13: Excluir grupo sem filhos ---${NC}"

# Excluir o filho do grupo fixo primeiro
api_call DELETE "/api/lancamentos/$FILHO_FIXO_ID" > /dev/null

# Agora excluir o grupo (não precisa de force)
RESPONSE=$(api_call DELETE "/api/lancamentos/$GRUPO_FIXO_ID")

# Verificar que foi excluído
RESPONSE=$(api_call GET "/api/lancamentos?mes=$MES")
GRUPO_EXISTS=$(echo "$RESPONSE" | jq '.saidas[] | select(.id == "'$GRUPO_FIXO_ID'") | .id')

if [ -z "$GRUPO_EXISTS" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Grupo sem filhos excluído"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Grupo não foi excluído"
  ((FAILED++))
fi

echo ""

# ========================================
# LIMPEZA FINAL
# ========================================
echo -e "${BLUE}Limpando dados restantes...${NC}"
api_call DELETE "/api/lancamentos/$GRUPO_ENTRADA_ID" > /dev/null 2>&1
echo -e "${BLUE}Limpeza concluída.${NC}"

# ========================================
# RESUMO
# ========================================
echo ""
echo "========================================"
echo "RESUMO DOS TESTES - SEÇÃO 2"
echo "========================================"
echo -e "Passou: ${GREEN}$PASSED${NC}"
echo -e "Falhou: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}SEÇÃO 2 COMPLETA - Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}SEÇÃO 2 INCOMPLETA - Alguns testes falharam.${NC}"
  exit 1
fi
