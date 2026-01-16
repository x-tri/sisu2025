# SISU 2025 Monitor - Dockerfile
FROM python:3.11-slim

# Metadata
LABEL maintainer="SISU Monitor"
LABEL description="Monitoramento de notas de corte do SISU em tempo real"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY pyproject.toml .
COPY README.md .

# Install Python dependencies
RUN pip install --no-cache-dir .

# Copy application code
COPY src/ src/
COPY main.py .
COPY scripts/ scripts/

# Create data directories
RUN mkdir -p data/raw data/processed data/history data/exports logs

# Create non-root user
RUN useradd -m -u 1000 sisu && chown -R sisu:sisu /app
USER sisu

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('https://meusisu.com', timeout=5)" || exit 1

# Default command
CMD ["python", "main.py"]
