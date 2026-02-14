#!/bin/sh
set -e
echo "[start] Starting Next.js on 0.0.0.0:${PORT:-3000}..."
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
