FROM python:3.11-slim

# Prevent Python from writing .pyc files & buffer output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user and persistent storage directories
RUN useradd -m -u 10001 appuser && \
    mkdir -p /app/uploads /app/data && \
    chown -R appuser:appuser /app

# Copy application source code
COPY . .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
