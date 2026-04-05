#!/usr/bin/env bash
set -euo pipefail

PORT=5173
MODE="${1:-serve}"

usage() {
  echo "Uso: ./ts-serve.sh [serve|funnel|stop]"
  echo ""
  echo "  serve   - disponibiliza na tailnet (padrão)"
  echo "  funnel  - disponibiliza publicamente na internet"
  echo "  stop    - para o dev server e remove do tailscale"
  exit 1
}

cleanup() {
  echo "Parando dev server (PID $VITE_PID)..."
  kill "$VITE_PID" 2>/dev/null || true
  echo "Removendo do Tailscale..."
  tailscale serve reset 2>/dev/null || true
  echo "Pronto."
}

if [[ "$MODE" == "stop" ]]; then
  # Mata qualquer vite rodando na porta e reseta tailscale
  PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    kill "$PID" 2>/dev/null || true
    echo "Dev server parado (PID $PID)."
  else
    echo "Nenhum processo na porta $PORT."
  fi
  tailscale serve reset 2>/dev/null || true
  echo "Tailscale resetado."
  exit 0
fi

if [[ "$MODE" != "serve" && "$MODE" != "funnel" ]]; then
  usage
fi

# Inicia o dev server em background
echo "Iniciando Vite dev server na porta $PORT..."
npm run dev -- --port "$PORT" --host &
VITE_PID=$!

# Espera o server estar pronto
echo "Aguardando server ficar pronto..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
  echo "Erro: dev server não subiu na porta $PORT"
  kill "$VITE_PID" 2>/dev/null || true
  exit 1
fi

echo "Dev server pronto!"

# Configura Tailscale
trap cleanup EXIT

if [[ "$MODE" == "funnel" ]]; then
  echo "Ativando Tailscale Funnel (acesso público)..."
  tailscale funnel --bg "http://localhost:$PORT"
  echo ""
  echo "Site público disponível em: https://$(tailscale status --self --json 2>/dev/null | grep -o '"DNSName":"[^"]*"' | cut -d'"' -f4 || echo 'veja a URL acima')"
else
  echo "Ativando Tailscale Serve (acesso tailnet)..."
  tailscale serve --bg "http://localhost:$PORT"
  echo ""
  echo "Site disponível na tailnet em: https://$(tailscale status --self --json 2>/dev/null | grep -o '"DNSName":"[^"]*"' | cut -d'"' -f4 || echo 'veja a URL acima')"
fi

echo ""
echo "Ctrl+C para parar."
wait "$VITE_PID"
