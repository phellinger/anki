#!/bin/bash

# Load environment variables
set -a
source .env.prod
set +a

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    sudo apt update
    sudo apt install -y certbot
fi

# Get SSL certificates if needed (using standalone mode)
sudo certbot certonly --standalone \
    --cert-name ${FRONTEND_DOMAIN} -d ${FRONTEND_DOMAIN} \
    --cert-name ${API_DOMAIN} -d ${API_DOMAIN}

# Create symbolic links to standardize certificate paths
sudo mkdir -p /etc/letsencrypt/live/${FRONTEND_DOMAIN}
sudo mkdir -p /etc/letsencrypt/live/${API_DOMAIN}

# Stop any running containers
docker-compose -f docker-compose.prod.yml down

# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build 