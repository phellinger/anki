#!/bin/bash

# Load environment variables and export them
set -a
source .env.dev
set +a

# Export variables for docker-compose and MySQL initialization
export $(cat .env.dev | grep -v '^#' | xargs)

# Create Docker network if it doesn't exist
docker network create app_network || true

# Stop any running containers
docker-compose -f docker-compose.dev.yml stop backend frontend mysql || true
docker-compose -f docker-compose.dev.yml rm -f backend frontend mysql || true

# If first argument is "reset", remove the mysql volume
if [ "$1" = "reset" ]; then
    docker volume rm anki_mysql_data || true
fi

# Build and start containers
docker-compose -f docker-compose.dev.yml up -d --build 