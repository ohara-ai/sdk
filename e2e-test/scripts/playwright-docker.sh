#!/usr/bin/env bash

# Start Playwright server in Docker for running browser tests
# Usage: ./scripts/playwright-docker.sh [port]
#
# The container exposes a WebSocket endpoint that Playwright tests connect to.
# Set PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:<port>/ before running tests.

PORT="${1:-3100}"
PLAYWRIGHT_VERSION="1.52.0"

echo "Starting Playwright server on port $PORT..."
echo "Connect with: PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:$PORT/ npm run test:browser"

docker run \
  -p "$PORT:$PORT" \
  --rm \
  --init \
  --add-host=host.docker.internal:host-gateway \
  --workdir /home/pwuser \
  --user pwuser \
  "mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble" \
  /bin/sh -c "npx -y playwright@${PLAYWRIGHT_VERSION} run-server --port $PORT --host 0.0.0.0"
