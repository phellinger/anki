#!/bin/sh
set -e

# Replace environment variables in template
envsubst '${FRONTEND_DOMAIN} ${API_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the default Docker command
exec "$@" 