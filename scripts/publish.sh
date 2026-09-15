#!/bin/sh
# Explicit registry publication; Docker login must be configured first.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -n "$(git status --porcelain)" ]; then
  echo 'Commit all release changes before publishing.' >&2
  exit 1
fi
TAG=$(git rev-parse --short=12 HEAD)
REGISTRY=${REGISTRY:-registry.shnea.kr}
PLATFORMS=${PLATFORMS:-linux/amd64}
export DOCKER_DEFAULT_PLATFORM=linux/amd64
sh scripts/verify.sh
for target in api nginx; do
  docker buildx build --platform "$PLATFORMS" --target "$target" --tag "$REGISTRY/jjapgma/$target:$TAG" --push .
done
echo "Published IMAGE_TAG=$TAG ($PLATFORMS). Production deployment is separate."
