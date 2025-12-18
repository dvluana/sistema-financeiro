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
echo "TESTES DE LANÇAMENTOS - SEÇÃO 5"
echo "EXCLUIR RECORRÊNCIA EM LOTE"
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
# TESTE 5.1: Excluir apenas este
# ========================================
echo -e "${YELLOW}--- Teste 5.1: Excluir apenas este ---${NC}"

# Criar série de 4 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Excluir",
  "valor": 400,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 4
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 4 lançamentos" "4" "$CRIADOS"

# Buscar segundo lançamento
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Excluir"))')
SEGUNDO_ID=$(echo "$SEGUNDO" | jq -r '.id')
test_not_null "Segundo ID existe" "$SEGUNDO_ID"

# Excluir apenas este
RESPONSE=$(api_call DELETE "/api/lancamentos/$SEGUNDO_ID/recorrencia?escopo=apenas_este")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 1 lançamento" "1" "$EXCLUIDOS"

# Verificar que segundo foi excluído
SEGUNDO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Excluir"))')
test_case "Segundo não existe mais" "" "$SEGUNDO_CHECK"

# Verificar que os outros permanecem
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Excluir"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
test_not_null "Primeiro ainda existe" "$PRIMEIRO_ID"

TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Excluir"))')
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')
test_not_null "Terceiro ainda existe" "$TERCEIRO_ID"

QUARTO=$(api_call GET "/api/lancamentos?mes=2025-07" | jq '.saidas[] | select(.nome | contains("Teste Excluir"))')
QUARTO_ID=$(echo "$QUARTO" | jq -r '.id')
test_not_null "Quarto ainda existe" "$QUARTO_ID"

# Limpar série para próximo teste
api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=todos" > /dev/null

echo ""

# ========================================
# TESTE 5.2: Excluir este e próximos
# ========================================
echo -e "${YELLOW}--- Teste 5.2: Excluir este e próximos ---${NC}"

# Criar série de 5 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Este Prox",
  "valor": 500,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 5
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 5 lançamentos" "5" "$CRIADOS"

# Buscar terceiro lançamento
TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')
test_not_null "Terceiro ID existe" "$TERCEIRO_ID"

# Excluir este e próximos
RESPONSE=$(api_call DELETE "/api/lancamentos/$TERCEIRO_ID/recorrencia?escopo=este_e_proximos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 3 lançamentos (3, 4, 5)" "3" "$EXCLUIDOS"

# Verificar que 1 e 2 ainda existem
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
test_not_null "Primeiro ainda existe" "$(echo "$PRIMEIRO" | jq -r '.id')"

SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
test_not_null "Segundo ainda existe" "$(echo "$SEGUNDO" | jq -r '.id')"

# Verificar que 3, 4, 5 foram excluídos
TERCEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
test_case "Terceiro não existe" "" "$TERCEIRO_CHECK"

QUARTO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-07" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
test_case "Quarto não existe" "" "$QUARTO_CHECK"

QUINTO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-08" | jq '.saidas[] | select(.nome | contains("Teste Este Prox"))')
test_case "Quinto não existe" "" "$QUINTO_CHECK"

# Limpar
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=todos" > /dev/null

echo ""

# ========================================
# TESTE 5.3: Excluir todos
# ========================================
echo -e "${YELLOW}--- Teste 5.3: Excluir todos ---${NC}"

# Criar série de 4 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Excluir Todos",
  "valor": 600,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 4
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 4 lançamentos" "4" "$CRIADOS"

# Buscar segundo lançamento (meio da série)
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Excluir Todos"))')
SEGUNDO_ID=$(echo "$SEGUNDO" | jq -r '.id')
test_not_null "Segundo ID existe" "$SEGUNDO_ID"

# Excluir todos
RESPONSE=$(api_call DELETE "/api/lancamentos/$SEGUNDO_ID/recorrencia?escopo=todos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 4 lançamentos" "4" "$EXCLUIDOS"

# Verificar que nenhum existe
PRIMEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Excluir Todos"))')
test_case "Primeiro não existe" "" "$PRIMEIRO_CHECK"

SEGUNDO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Excluir Todos"))')
test_case "Segundo não existe" "" "$SEGUNDO_CHECK"

TERCEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Excluir Todos"))')
test_case "Terceiro não existe" "" "$TERCEIRO_CHECK"

QUARTO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-07" | jq '.saidas[] | select(.nome | contains("Teste Excluir Todos"))')
test_case "Quarto não existe" "" "$QUARTO_CHECK"

echo ""

# ========================================
# TESTE 5.4: Edge case - último da série
# ========================================
echo -e "${YELLOW}--- Teste 5.4: Edge case - último da série ---${NC}"

# Criar série de 3 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Ultimo",
  "valor": 300,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 lançamentos" "3" "$CRIADOS"

# Buscar último lançamento
ULTIMO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Ultimo"))')
ULTIMO_ID=$(echo "$ULTIMO" | jq -r '.id')
test_not_null "Último ID existe" "$ULTIMO_ID"

# Excluir "este e próximos" no último (deve excluir apenas 1)
RESPONSE=$(api_call DELETE "/api/lancamentos/$ULTIMO_ID/recorrencia?escopo=este_e_proximos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Este e próximos no último exclui só 1" "1" "$EXCLUIDOS"

# Verificar que 1 e 2 ainda existem
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Ultimo"))')
test_not_null "Primeiro ainda existe" "$(echo "$PRIMEIRO" | jq -r '.id')"

SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Ultimo"))')
test_not_null "Segundo ainda existe" "$(echo "$SEGUNDO" | jq -r '.id')"

# Verificar que último foi excluído
ULTIMO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Ultimo"))')
test_case "Último não existe" "" "$ULTIMO_CHECK"

# Limpar
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=todos" > /dev/null

echo ""

# ========================================
# TESTE 5.5: Excluir ENTRADA recorrente
# ========================================
echo -e "${YELLOW}--- Teste 5.5: Excluir ENTRADA recorrente ---${NC}"

# Criar entrada recorrente
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "entrada",
  "nome": "Salario Teste Del",
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
PRIMEIRA=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.entradas[] | select(.nome == "Salario Teste Del")')
PRIMEIRA_ID=$(echo "$PRIMEIRA" | jq -r '.id')
test_not_null "Primeira entrada existe" "$PRIMEIRA_ID"

# Excluir todos
RESPONSE=$(api_call DELETE "/api/lancamentos/$PRIMEIRA_ID/recorrencia?escopo=todos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 3 entradas" "3" "$EXCLUIDOS"

# Verificar que nenhuma existe
PRIMEIRA_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.entradas[] | select(.nome == "Salario Teste Del")')
test_case "Primeira entrada não existe" "" "$PRIMEIRA_CHECK"

SEGUNDA_CHECK=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.entradas[] | select(.nome == "Salario Teste Del")')
test_case "Segunda entrada não existe" "" "$SEGUNDA_CHECK"

TERCEIRA_CHECK=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.entradas[] | select(.nome == "Salario Teste Del")')
test_case "Terceira entrada não existe" "" "$TERCEIRA_CHECK"

echo ""

# ========================================
# TESTE 5.6: Excluir legado (sem recorrencia_id)
# ========================================
echo -e "${YELLOW}--- Teste 5.6: Excluir lançamento legado ---${NC}"

# Criar lançamento simples (sem recorrência)
RESPONSE=$(api_call POST "/api/lancamentos" '{
  "tipo": "saida",
  "nome": "Legado Excluir",
  "valor": 200,
  "mes": "2025-04",
  "concluido": false
}')

LEGADO=$(echo "$RESPONSE" | jq '.saidas[] | select(.nome == "Legado Excluir")')
LEGADO_ID=$(echo "$LEGADO" | jq -r '.id')
test_not_null "Lançamento legado criado" "$LEGADO_ID"

# Tentar excluir com escopo "todos" (deve funcionar como apenas_este)
RESPONSE=$(api_call DELETE "/api/lancamentos/$LEGADO_ID/recorrencia?escopo=todos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 1 lançamento (legado)" "1" "$EXCLUIDOS"

# Verificar que foi excluído
LEGADO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome == "Legado Excluir")')
test_case "Legado não existe" "" "$LEGADO_CHECK"

echo ""

# ========================================
# TESTE 5.7: Série parcialmente excluída
# ========================================
echo -e "${YELLOW}--- Teste 5.7: Excluir série parcialmente excluída ---${NC}"

# Criar série de 5 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Parcial Del",
  "valor": 500,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 5
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 5 lançamentos" "5" "$CRIADOS"

# Excluir manualmente o segundo e o quarto
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
SEGUNDO_ID=$(echo "$SEGUNDO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$SEGUNDO_ID" > /dev/null

QUARTO=$(api_call GET "/api/lancamentos?mes=2025-07" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
QUARTO_ID=$(echo "$QUARTO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$QUARTO_ID" > /dev/null

# Verificar que 1, 3, 5 ainda existem
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
test_not_null "Primeiro ainda existe" "$PRIMEIRO_ID"

TERCEIRO=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
test_not_null "Terceiro ainda existe" "$(echo "$TERCEIRO" | jq -r '.id')"

# Excluir todos restantes usando o terceiro
TERCEIRO_ID=$(echo "$TERCEIRO" | jq -r '.id')
RESPONSE=$(api_call DELETE "/api/lancamentos/$TERCEIRO_ID/recorrencia?escopo=todos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 3 restantes" "3" "$EXCLUIDOS"

# Verificar que nenhum existe
PRIMEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
test_case "Primeiro não existe" "" "$PRIMEIRO_CHECK"

TERCEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-06" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
test_case "Terceiro não existe" "" "$TERCEIRO_CHECK"

QUINTO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-08" | jq '.saidas[] | select(.nome | contains("Teste Parcial Del"))')
test_case "Quinto não existe" "" "$QUINTO_CHECK"

echo ""

# ========================================
# TESTE 5.8: Excluir do primeiro mês
# ========================================
echo -e "${YELLOW}--- Teste 5.8: Excluir do primeiro mês ---${NC}"

# Criar série de 3 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Primeiro Mes",
  "valor": 300,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 lançamentos" "3" "$CRIADOS"

# Excluir do primeiro mês com "este e próximos" (deve excluir todos)
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Primeiro Mes"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')

RESPONSE=$(api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=este_e_proximos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Este e próximos do primeiro exclui 3" "3" "$EXCLUIDOS"

# Verificar que nenhum existe
PRIMEIRO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Primeiro Mes"))')
test_case "Nenhum existe" "" "$PRIMEIRO_CHECK"

echo ""

# ========================================
# TESTE 5.9: Verificar totais atualizados
# ========================================
echo -e "${YELLOW}--- Teste 5.9: Verificar totais atualizados após exclusão ---${NC}"

# Criar série de 3 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Totais",
  "valor": 100,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 lançamentos" "3" "$CRIADOS"

# Verificar totais antes
RESPONSE=$(api_call GET "/api/lancamentos?mes=2025-04")
SAIDAS_ANTES=$(echo "$RESPONSE" | jq -r '.totais.saidas')
test_case "Saídas antes = 100" "100" "$SAIDAS_ANTES"

# Excluir o primeiro
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Totais"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=apenas_este" > /dev/null

# Verificar totais depois
RESPONSE=$(api_call GET "/api/lancamentos?mes=2025-04")
SAIDAS_DEPOIS=$(echo "$RESPONSE" | jq -r '.totais.saidas')
test_case "Saídas depois = 0" "0" "$SAIDAS_DEPOIS"

# Limpar restantes
SEGUNDO=$(api_call GET "/api/lancamentos?mes=2025-05" | jq '.saidas[] | select(.nome | contains("Teste Totais"))')
SEGUNDO_ID=$(echo "$SEGUNDO" | jq -r '.id')
api_call DELETE "/api/lancamentos/$SEGUNDO_ID/recorrencia?escopo=todos" > /dev/null

echo ""

# ========================================
# TESTE 5.10: Excluir grupo recorrente (sem filhos)
# ========================================
echo -e "${YELLOW}--- Teste 5.10: Excluir grupo recorrente sem filhos ---${NC}"

# Criar grupo recorrente
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Grupo Rec Del",
  "valor": 0,
  "mes_inicial": "2025-04",
  "concluido": false,
  "is_agrupador": true,
  "valor_modo": "soma",
  "recorrencia": {
    "tipo": "mensal",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 grupos" "3" "$CRIADOS"

# Excluir todos
GRUPO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome == "Grupo Rec Del")')
GRUPO_ID=$(echo "$GRUPO" | jq -r '.id')

RESPONSE=$(api_call DELETE "/api/lancamentos/$GRUPO_ID/recorrencia?escopo=todos")
EXCLUIDOS=$(echo "$RESPONSE" | jq -r '.excluidos')
test_case "Excluiu 3 grupos" "3" "$EXCLUIDOS"

# Verificar que nenhum existe
GRUPO_CHECK=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome == "Grupo Rec Del")')
test_case "Nenhum grupo existe" "" "$GRUPO_CHECK"

echo ""

# ========================================
# TESTE 5.11: Meses afetados no response
# ========================================
echo -e "${YELLOW}--- Teste 5.11: Meses afetados no response ---${NC}"

# Criar série de 3 parcelas
RESPONSE=$(api_call POST "/api/lancamentos/recorrente" '{
  "tipo": "saida",
  "nome": "Teste Meses",
  "valor": 300,
  "mes_inicial": "2025-04",
  "concluido": false,
  "recorrencia": {
    "tipo": "parcelas",
    "quantidade": 3
  }
}')

CRIADOS=$(echo "$RESPONSE" | jq -r '.criados')
test_case "Criou 3 lançamentos" "3" "$CRIADOS"

# Excluir todos e verificar meses afetados
PRIMEIRO=$(api_call GET "/api/lancamentos?mes=2025-04" | jq '.saidas[] | select(.nome | contains("Teste Meses"))')
PRIMEIRO_ID=$(echo "$PRIMEIRO" | jq -r '.id')

RESPONSE=$(api_call DELETE "/api/lancamentos/$PRIMEIRO_ID/recorrencia?escopo=todos")
MESES=$(echo "$RESPONSE" | jq -r '.mesesAfetados | length')
test_case "3 meses afetados" "3" "$MESES"

MES_1=$(echo "$RESPONSE" | jq -r '.mesesAfetados[0]')
MES_2=$(echo "$RESPONSE" | jq -r '.mesesAfetados[1]')
MES_3=$(echo "$RESPONSE" | jq -r '.mesesAfetados[2]')
test_case "Mês 1 é 2025-04" "2025-04" "$MES_1"
test_case "Mês 2 é 2025-05" "2025-05" "$MES_2"
test_case "Mês 3 é 2025-06" "2025-06" "$MES_3"

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
echo "RESUMO DOS TESTES - SEÇÃO 5"
echo "========================================"
echo -e "Passou: ${GREEN}$PASSED${NC}"
echo -e "Falhou: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}SEÇÃO 5 COMPLETA - Todos os testes passaram!${NC}"
  exit 0
else
  echo -e "${RED}SEÇÃO 5 INCOMPLETA - Alguns testes falharam.${NC}"
  exit 1
fi
