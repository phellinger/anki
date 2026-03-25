include .env.target
export

# --- Docker Compose (dev) ---
COMPOSE_DEV := docker compose --env-file .env.dev -f docker-compose.dev.yml

# Browser origin for CORS when using host CRA (`make frontend-start` → http://localhost:3000).
# For Docker-only frontend (:3123): `FRONTEND_URL=http://localhost:3123 make dev-backend`
DEV_FRONTEND_URL ?= http://localhost:3000

# =============================================================================
# Local dev (recommended): MySQL + backend in Docker, CRA on the host
#   1. make dev-backend
#   2. make frontend-install    # once
#   3. make frontend-start      # http://localhost:3000
# Unset REACT_APP_API_URL in your shell so api.js uses '' + package.json "proxy".
# =============================================================================

.PHONY: dev
dev:
	@echo "Recommended workflow (backend in Docker, React on host):"
	@echo "  1. make dev-backend"
	@echo "  2. make frontend-install   # once"
	@echo "  3. make frontend-start     # http://localhost:3000"
	@echo "Unset REACT_APP_API_URL for local shell so the dev proxy works (see .env.dev)."
	@echo "If the backend image is missing npm packages: make backend-npm-install"

.PHONY: dev-backend
dev-backend:
	FRONTEND_URL=$(DEV_FRONTEND_URL) $(COMPOSE_DEV) up -d --build mysql backend

# Refresh backend dependencies inside Docker’s node_modules volume (needed after package.json changes).
.PHONY: backend-npm-install
backend-npm-install:
	$(COMPOSE_DEV) run --rm backend npm install

.PHONY: dev-backend-logs
dev-backend-logs:
	docker logs -f backend

.PHONY: dev-backend-stop
dev-backend-stop:
	$(COMPOSE_DEV) stop mysql backend

.PHONY: dev-down
dev-down:
	$(COMPOSE_DEV) down

# Full stack in Docker (MySQL + backend + CRA container on :3123) — same as update-dev
.PHONY: dev-full
dev-full: update-dev

.PHONY: frontend-install
frontend-install:
	cd frontend && npm install

.PHONY: frontend-start
frontend-start:
	cd frontend && npm start

# =============================================================================
# Remote / full Docker dev
# =============================================================================

.PHONY: update-prod
update-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh; docker ps"

.PHONY: update-dev
update-dev:
	./setup-dev.sh
	docker ps

# TODO: This is not working
.PHONY: reset-prod
reset-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh reset; docker ps"

.PHONY: reset-dev
reset-dev:
	./setup-dev.sh reset
	docker ps
