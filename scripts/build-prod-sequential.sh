#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
SERVICES="gateway market-fetcher flipper ratting rock-radar appraisal fleet market"

for service in $SERVICES; do
  echo "==> Building $service"
  COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build "$service"
done

echo "==> Starting services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build

echo "==> Running DB migrations"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec gateway npm run db:migrate:deploy -w @netk/database
