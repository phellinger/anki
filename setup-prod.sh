#!/bin/bash

# Load environment variables and export them
set -a
source .env.prod
set +a

# Create Docker network if it doesn't exist (required by nginx-proxy; create once or let nginx-proxy create it)
docker network create app_network || true

# Export variables for docker-compose
export $(cat .env.prod | grep -v '^#' | xargs)

# Stop any running anki containers
docker-compose -f docker-compose.prod.yml stop || true
docker-compose -f docker-compose.prod.yml rm -f || true

# If first argument is "reset", remove the mysql volume
if [ "$1" = "reset" ]; then
    docker volume rm anki_mysql_data_prod || true
fi

# Build and start application containers (expects nginx-proxy + app_network already running)
docker-compose -f docker-compose.prod.yml up -d --build

echo "Setup complete!"
echo "Ensure nginx-proxy is running on this host (e.g. from nginx-proxy repo). SSL is handled by its Let's Encrypt companion."
echo "Check anki logs: docker logs anki_backend_prod; docker logs anki_frontend_prod"
