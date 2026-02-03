# XTRI SISU 2026 - Backend Dockerfile
FROM python:3.11-slim

# Metadata
LABEL maintainer="XTRI SISU 2026"
LABEL description="Backend API para XTRI SISU 2026"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

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
    CMD curl -f http://localhost:8000/health || exit 1

# Default command - API server
CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
