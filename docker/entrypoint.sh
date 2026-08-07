#!/bin/sh
set -eu

echo "Waiting for PostgreSQL..."

node docker/wait-for-db.mjs

echo "PostgreSQL is available."

if [ "${RUN_DATABASE_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  ./node_modules/.bin/tsx src/db/migrate.ts
fi

if [ "${RUN_DATABASE_SEED:-false}" = "true" ]; then
  echo "Running database seed..."
  ./node_modules/.bin/tsx src/db/seed.ts
fi

echo "Starting Next.js..."
exec node server.js
