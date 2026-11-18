#!/bin/bash
# Serve Port Solano locally for screenshot runs. Usage: ./run-server.sh [port]
set -e
cd ~/workspace/makefun/gta6-01-entry
PORT="${1:-8080}"
if ss -tln 2>/dev/null | grep -q ":$PORT "; then
  echo "port $PORT already in use" >&2
  exit 1
fi
node serve.ts --port "$PORT"
