# Nginx Proxy Setup for Multiple Domains

This setup allows you to serve multiple domains using a single nginx-proxy container. The nginx-proxy automatically detects containers with the appropriate environment variables and routes traffic to them based on the requested domain.

## Initial Setup

1. Run the setup script to create the necessary directory structure:

   ```
   chmod +x setup-nginx-proxy.sh
   ./setup-nginx-proxy.sh
   ```

2. Update your `.env.prod` file with your domain information:

   ```
   FRONTEND_DOMAIN=anki.today
   API_DOMAIN=api.anki.today
   NEW_SERVICE_DOMAIN=your-new-domain.com
   ```

3. Run the production setup script:
   ```
   ./setup-prod.sh
   ```

## Adding a New Domain/Service

To add a new service with its own domain:

1. Add the new domain to your `.env.prod` file:

   ```
   NEW_SERVICE_DOMAIN=your-new-domain.com
   ```

2. Add the service to your `docker-compose.prod.yml` file:

   ```yaml
   new-service:
     image: your-service-image
     container_name: your_service_container
     restart: always
     environment:
       - VIRTUAL_HOST=${NEW_SERVICE_DOMAIN}
       - VIRTUAL_PORT=8080 # The port your service listens on
       - LETSENCRYPT_HOST=${NEW_SERVICE_DOMAIN}
     # Add labels for custom nginx configuration (if needed)
     labels:
       - 'com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy.custom_nginx_server_config=location = /favicon.ico { proxy_pass http://new-service:8080/favicon.ico; access_log off; log_not_found off; expires max; }'
       - "com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy.custom_nginx_location_config=location ~* \\.(ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ { proxy_pass http://new-service:8080; expires max; add_header Cache-Control 'public, max-age=31536000'; }"
     networks:
       - app_network
   ```

3. Update the SSL certificate configuration in `setup-prod.sh`:

   ```bash
   sudo certbot certonly --standalone \
       --keep-until-expiring \
       --cert-name ${FRONTEND_DOMAIN} -d ${FRONTEND_DOMAIN} \
       --cert-name ${API_DOMAIN} -d ${API_DOMAIN} \
       --cert-name ${NEW_SERVICE_DOMAIN} -d ${NEW_SERVICE_DOMAIN} \
       --non-interactive

   sudo mkdir -p /etc/letsencrypt/live/${NEW_SERVICE_DOMAIN}
   ```

4. Run the setup script again:
   ```
   ./setup-prod.sh
   ```

## Handling Static Files (favicon, CSS, JS, etc.)

To ensure static files like favicon.ico are properly served, add the following labels to your service in `docker-compose.prod.yml`:

```yaml
labels:
  # Specific rule for favicon.ico
  - 'com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy.custom_nginx_server_config=location = /favicon.ico { proxy_pass http://your-service:port/favicon.ico; access_log off; log_not_found off; expires max; }'

  # General rule for all static files with caching
  - "com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy.custom_nginx_location_config=location ~* \\.(ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ { proxy_pass http://your-service:port; expires max; add_header Cache-Control 'public, max-age=31536000'; }"
```

Replace `your-service:port` with your actual service name and port (e.g., `frontend:3123`).

## How It Works

The nginx-proxy container monitors the Docker socket for container start and stop events. When a container with `VIRTUAL_HOST` environment variables starts, nginx-proxy automatically creates the necessary configuration to route requests for that domain to the container.

The key environment variables are:

- `VIRTUAL_HOST`: The domain name(s) to route to this container
- `VIRTUAL_PORT`: The port inside the container that the service is listening on
- `LETSENCRYPT_HOST`: The domain for which to use SSL certificates

## Troubleshooting

- Check the logs of the nginx-proxy container:

  ```
  docker logs nginx-proxy
  ```

- Ensure your DNS records are properly configured to point to your server's IP address

- Verify that the SSL certificates exist in the expected locations

- If static files like favicon.ico are not being served:
  1. Check that the labels are correctly configured in your docker-compose file
  2. Restart the nginx-proxy container: `docker-compose -f docker-compose.nginx-proxy.yml down && docker-compose -f docker-compose.nginx-proxy.yml up -d`
  3. Verify the file exists in your service's public directory
