# XTRI SISU 2026 - Makefile
.PHONY: help build up down restart logs shell-backend shell-frontend test deploy ssl

# Default target
help:
	@echo "XTRI SISU 2026 - Comandos disponíveis:"
	@echo ""
	@echo "  make build          - Buildar todos os containers"
	@echo "  make up             - Iniciar todos os serviços"
	@echo "  make down           - Parar todos os serviços"
	@echo "  make restart        - Reiniciar todos os serviços"
	@echo "  make logs           - Ver logs de todos os serviços"
	@echo "  make logs-backend   - Ver logs do backend"
	@echo "  make logs-frontend  - Ver logs do frontend"
	@echo "  make shell-backend  - Acessar shell do backend"
	@echo "  make shell-frontend - Acessar shell do frontend"
	@echo "  make test           - Testar endpoints"
	@echo "  make deploy         - Deploy completo"
	@echo "  make ssl DOMAIN=... - Configurar SSL"
	@echo ""

# Build all containers
build:
	docker compose build --no-cache

# Start all services
up:
	docker compose up -d

# Stop all services
down:
	docker compose down

# Restart all services
restart: down up

# View all logs
logs:
	docker compose logs -f

# View backend logs
logs-backend:
	docker logs sisu-backend --tail 100 -f

# View frontend logs
logs-frontend:
	docker logs sisu-frontend --tail 100 -f

# Shell into backend
shell-backend:
	docker exec -it sisu-backend bash

# Shell into frontend
shell-frontend:
	docker exec -it sisu-frontend sh

# Test endpoints
test:
	@echo "Testing health endpoint..."
	@curl -s http://localhost:8082/health | jq . || curl -s http://localhost:8082/health
	@echo ""
	@echo "Testing API endpoint..."
	@curl -s "http://localhost:8082/api/courses?limit=2" | jq . || curl -s "http://localhost:8082/api/courses?limit=2"

# Full deploy
deploy:
	./scripts/deploy.sh

# Setup SSL
ssl:
	@if [ -z "$(DOMAIN)" ]; then \
		echo "Usage: make ssl DOMAIN=sisu2026.xtri.com.br"; \
		exit 1; \
	fi
	./scripts/setup-ssl.sh $(DOMAIN)
