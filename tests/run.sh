#!/usr/bin/env bash
# Run the browser test suite headlessly and exit non-zero on any failure.
# Needs python3 (static server) and Google Chrome; override with CHROME=/path/to/chrome.
# To see the results in a browser instead: python3 -m http.server, then open /tests/
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8765}"
PROFILE="$(mktemp -d)"

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true; rm -rf "$PROFILE"' EXIT
sleep 1

DOM="$("$CHROME" --headless=new --no-sandbox --disable-gpu --user-data-dir="$PROFILE" \
  --virtual-time-budget=30000 --dump-dom "http://127.0.0.1:$PORT/tests/" 2>/dev/null)"

printf '%s\n' "$DOM" | grep -o '<li class="[a-z]*">[^<]*' \
  | sed -e 's/<li class="pass">/  ok    /' -e 's/<li class="fail">/  FAIL  /'
printf '%s\n' "$DOM" | grep -o 'id="summary">[^<]*' | sed 's/.*>//'
printf '%s\n' "$DOM" | grep -q 'data-result="pass"'
