#!/bin/bash

# Script para matar processos que estão usando as portas do projeto
# Compatível com macOS e Linux

PORTS=(3333 5173 5174)

for PORT in "${PORTS[@]}"; do
  # macOS usa lsof, Linux também suporta
  # -t retorna apenas PIDs, um por linha
  PIDS=$(lsof -ti:$PORT 2>/dev/null)
  
  if [ ! -z "$PIDS" ]; then
    # Itera sobre cada PID (pode haver múltiplos processos na mesma porta)
    for PID in $PIDS; do
      echo "🔪 Matando processo na porta $PORT (PID: $PID)"
      kill -9 $PID 2>/dev/null || true
    done
    sleep 0.5
  else
    echo "✅ Porta $PORT está livre"
  fi
done

echo "✨ Limpeza de portas concluída"

