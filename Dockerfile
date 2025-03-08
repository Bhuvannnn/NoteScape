# Use multi-stage builds for efficient Docker images

# Backend build stage
FROM python:3.9-slim AS backend-build

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY app/api app/api
COPY app/data app/data
COPY app/db app/db
COPY app/ml app/ml
COPY app/utils app/utils

# Frontend build stage
FROM node:16-alpine AS frontend-build

WORKDIR /app

# Copy package.json and install dependencies
COPY app/client/package.json app/client/package-lock.json* ./
RUN npm install

# Copy the rest of the frontend code and build
COPY app/client/ ./
RUN npm run build

# Final stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from backend-build
COPY --from=backend-build /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

# Copy backend code
COPY --from=backend-build /app/app/api app/api
COPY --from=backend-build /app/app/data app/data
COPY --from=backend-build /app/app/db app/db
COPY --from=backend-build /app/app/ml app/ml
COPY --from=backend-build /app/app/utils app/utils

# Copy frontend build
COPY --from=frontend-build /app/build app/client/build

# Copy startup script and environment file
COPY .env.example .env.example
COPY requirements.txt .

# Set up environment variables
ENV PYTHONPATH=/app
ENV API_HOST=0.0.0.0
ENV API_PORT=8000

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["python", "app/api/main.py"] 