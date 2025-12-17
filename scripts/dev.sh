#!/bin/bash

# =============================================================================
# Script de Desenvolvimento Robusto
# =============================================================================
# Garante que a API esteja pronta antes de iniciar o frontend.
# Gerencia processos corretamente e permite shutdown limpo.
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configurações
API_PORT=${API_PORT:-3333}
WEB_PORT=${WEB_PORT:-5173}
API_HEALTH_URL="http://localhost:${API_PORT}/health"
MAX_RETRIES=60
RETRY_INTERVAL=0.3

# PIDs dos processos
API_PID=""
WEB_PID=""

# =============================================================================
# Funções de utilidade
# =============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Cleanup na saída (Ctrl+C ou erro)
cleanup() {
  echo ""
  log_step "Encerrando processos..."

  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
    log_info "Parando frontend (PID: $WEB_PID)"
    kill -TERM "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
  fi

  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    log_info "Parando API (PID: $API_PID)"
    kill -TERM "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi

  # Mata qualquer processo órfão nas portas
  for PORT in $API_PORT $WEB_PORT; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
  done

  log_success "Todos os processos encerrados"
  exit 0
}

# Registra handler de cleanup
trap cleanup SIGINT SIGTERM EXIT

# =============================================================================
# Passo 1: Limpar portas
# =============================================================================

log_step "Passo 1: Liberando portas"

for PORT in $API_PORT $WEB_PORT; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    log_warn "Matando processos na porta $PORT"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    sleep 0.5
  else
    log_success "Porta $PORT livre"
  fi
done

# =============================================================================
# Passo 2: Verificar dependências
# =============================================================================

log_step "Passo 2: Verificando ambiente"

# Verifica se o .env existe
if [ ! -f "apps/api/.env" ]; then
  log_error "Arquivo apps/api/.env não encontrado!"
  log_info "Copie apps/api/.env.example para apps/api/.env e configure as variáveis"
  exit 1
fi

log_success "Arquivo .env encontrado"

# =============================================================================
# Passo 3: Iniciar API
# =============================================================================

log_step "Passo 3: Iniciando API"

# Inicia API em background
cd apps/api
npm run dev > /tmp/api.log 2>&1 &
API_PID=$!
cd ../..

log_info "API iniciada (PID: $API_PID)"
log_info "Aguardando API estar pronta..."

# Aguarda API responder
RETRIES=0
START_TIME=$(date +%s)
while [ $RETRIES -lt $MAX_RETRIES ]; do
  if curl -s --max-time 1 "$API_HEALTH_URL" > /dev/null 2>&1; then
    echo ""
    ELAPSED=$(($(date +%s) - START_TIME))
    log_success "API pronta em ${ELAPSED}s"
    break
  fi

  # Verifica se o processo ainda está rodando
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo ""
    log_error "API parou inesperadamente!"
    log_info "Últimas linhas do log:"
    tail -20 /tmp/api.log 2>/dev/null || true
    exit 1
  fi

  RETRIES=$((RETRIES + 1))
  # Mostra progresso a cada 10 tentativas
  if [ $((RETRIES % 10)) -eq 0 ]; then
    ELAPSED=$(($(date +%s) - START_TIME))
    printf " ${ELAPSED}s"
  else
    printf "."
  fi
  sleep $RETRY_INTERVAL
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
  echo ""
  log_error "API não respondeu após $(echo "$MAX_RETRIES * $RETRY_INTERVAL" | bc)s"
  log_info "Últimas linhas do log:"
  tail -20 /tmp/api.log 2>/dev/null || true
  exit 1
fi

# =============================================================================
# Passo 4: Iniciar Frontend
# =============================================================================

log_step "Passo 4: Iniciando Frontend"

cd apps/web
npm run dev > /tmp/web.log 2>&1 &
WEB_PID=$!
cd ../..

log_info "Frontend iniciado (PID: $WEB_PID)"

# Aguarda um pouco para o Vite iniciar
sleep 2

# Verifica se o processo está rodando
if ! kill -0 "$WEB_PID" 2>/dev/null; then
  log_error "Frontend parou inesperadamente!"
  log_info "Últimas linhas do log:"
  tail -20 /tmp/web.log 2>/dev/null || true
  exit 1
fi

# =============================================================================
# Passo 5: Exibir informações e monitorar
# =============================================================================

log_step "Ambiente de desenvolvimento pronto!"

echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                                                           ║"
echo "  ║   API:      http://localhost:${API_PORT}                       ║"
echo "  ║   Frontend: http://localhost:${WEB_PORT}                       ║"
echo "  ║                                                           ║"
echo "  ║   Pressione Ctrl+C para parar                             ║"
echo "  ║                                                           ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Monitora os processos
log_info "Monitorando processos... (logs em /tmp/api.log e /tmp/web.log)"
echo ""

# Loop de monitoramento
while true; do
  # Verifica se API ainda está rodando
  if ! kill -0 "$API_PID" 2>/dev/null; then
    log_error "API parou! Últimas linhas do log:"
    tail -10 /tmp/api.log 2>/dev/null || true
    exit 1
  fi

  # Verifica se Frontend ainda está rodando
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    log_error "Frontend parou! Últimas linhas do log:"
    tail -10 /tmp/web.log 2>/dev/null || true
    exit 1
  fi

  sleep 5
done
