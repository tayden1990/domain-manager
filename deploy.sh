#!/bin/bash

# Build and deploy script
set -e

echo "🔨 Building Docker image..."
docker build -t domain-manager-bot:latest .

echo "🏷️ Tagging image..."
docker tag domain-manager-bot:latest taksa1990/domain-manager-bot:latest
docker tag domain-manager-bot:latest taksa1990/domain-manager-bot:$(date +%Y%m%d)

echo "📤 Pushing to Docker Hub..."
docker push taksa1990/domain-manager-bot:latest
docker push taksa1990/domain-manager-bot:$(date +%Y%m%d)

echo "✅ Deployment complete!"
echo "🚀 To run on server: docker run --env-file .env -v ./data:/app/data taksa1990/domain-manager-bot:latest"
