#!/bin/sh
set -e

# Debug: Print environment variables
echo "FRONTEND_DOMAIN: ${FRONTEND_DOMAIN}"
echo "API_DOMAIN: ${API_DOMAIN}"

# Debug: Check if certificate files exist
ls -la /etc/nginx/certs/live/${FRONTEND_DOMAIN} || echo "Frontend certs not found"
ls -la /etc/nginx/certs/live/${API_DOMAIN} || echo "API certs not found"

# Replace environment variables in template
envsubst '${FRONTEND_DOMAIN} ${API_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: Print processed config
echo "Generated Nginx config:"
cat /etc/nginx/conf.d/default.conf

# Execute the default Docker command
exec "$@"