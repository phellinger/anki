# anki
Anki Learning Site

## Production

Production deploy expects **nginx-proxy with Let's Encrypt** on the same host. This repo no longer includes the proxy; anki only starts its own stack and joins the shared `app_network`.

- **Option A – nginx-proxy in this repo:** Use the `nginx-proxy/` subdirectory: deploy and start it first (e.g. `make -C nginx-proxy update-prod`), then deploy anki (`make update-prod`). See `nginx-proxy/README.md`.
- **Option B – separate nginx-proxy repo:** After moving `nginx-proxy/` to its own repo, deploy nginx-proxy from that repo first, then deploy anki from this repo. Both must use the same Docker network `app_network` on the server.

`setup-prod.sh` creates `app_network` if missing and starts only the anki containers. The backend and frontend set `VIRTUAL_HOST` / `LETSENCRYPT_HOST` so the existing nginx-proxy serves them with HTTPS.
