#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cleanup() { docker compose -f compose.test.yaml down --remove-orphans; }
trap cleanup EXIT
docker compose -f compose.test.yaml config --quiet
docker compose -f compose.test.yaml build
docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test
