.PHONY: run test notify-test install dev lint clean docker-build docker-run help

# Default target
help:
	@echo "SISU 2025 Monitor - Comandos disponiveis:"
	@echo ""
	@echo "  make install      - Instalar dependencias"
	@echo "  make dev          - Instalar com dependencias de desenvolvimento"
	@echo "  make run          - Iniciar monitoramento"
	@echo "  make run-once     - Executar uma iteracao"
	@echo "  make test         - Rodar testes"
	@echo "  make notify-test  - Testar notificacoes"
	@echo "  make lint         - Verificar codigo"
	@echo "  make clean        - Limpar cache"
	@echo "  make docker-build - Construir imagem Docker"
	@echo "  make docker-run   - Rodar em Docker"
	@echo ""

# Instalacao
install:
	pip install -e .

dev:
	pip install -e ".[dev]"

# Execucao
run:
	python main.py

run-once:
	python main.py --once

run-debug:
	python main.py --debug

# Testes
test:
	pytest tests/ -v

test-cov:
	pytest tests/ --cov=src --cov-report=html

notify-test:
	python scripts/test_notifications.py

# Qualidade de codigo
lint:
	ruff check src/
	mypy src/

format:
	ruff format src/

# Analise
history:
	python scripts/analyze_history.py

# Limpeza
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov/ .coverage

clean-data:
	rm -rf data/raw/* data/processed/* data/history/*
	touch data/raw/.gitkeep data/processed/.gitkeep data/history/.gitkeep

# Docker
docker-build:
	docker build -t sisu-monitor:latest .

docker-run:
	docker run -it --rm \
		-v $(PWD)/config:/app/config \
		-v $(PWD)/data:/app/data \
		-v $(PWD)/logs:/app/logs \
		sisu-monitor:latest

docker-shell:
	docker run -it --rm \
		-v $(PWD)/config:/app/config \
		sisu-monitor:latest /bin/sh
