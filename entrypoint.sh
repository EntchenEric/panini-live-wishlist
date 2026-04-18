#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate resolve --rolled-back 0_init || true
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js server..."
exec node server.js