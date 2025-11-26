#!/bin/bash

# Build Docker image with Firebase environment variables
# This script loads env vars from .env file and passes them as build arguments

echo "🚀 Building Docker image with Firebase configuration..."

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env file"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Build the Docker image with all required build arguments
docker build \
    --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
    --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME}" \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}" \
    --build-arg NEXT_PUBLIC_FIREBASE_VAPID_KEY="${NEXT_PUBLIC_FIREBASE_VAPID_KEY}" \
    --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" \
    -t talio-hrms:latest \
    .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo "📦 Image: talio-hrms:latest"
    echo ""
    echo "To run the container:"
    echo "  docker-compose up -d"
else
    echo "❌ Docker build failed!"
    exit 1
fi

