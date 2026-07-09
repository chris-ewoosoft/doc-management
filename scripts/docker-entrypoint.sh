#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx drizzle-kit migrate
else
  echo "WARNING: DATABASE_URL is not set — skipping migrations."
fi

echo "Starting application..."
exec node dist/index.js
