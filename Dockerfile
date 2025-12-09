# ============================================
# Talio HRMS - Production Dockerfile
# Optimized for faster builds with layer caching
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install build dependencies (cached layer)
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies (cached if package.json unchanged)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Copy env files
COPY .env* ./
RUN if [ -f .env ]; then cp .env .env.local; fi

# Build arguments
ARG NEXT_PUBLIC_APP_URL=https://app.talio.in
ARG NEXT_PUBLIC_APP_NAME=Talio HRMS
ARG NEXT_PUBLIC_GEMINI_API_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_ELEVENLABS_API_KEY
ARG NEXT_PUBLIC_ELEVENLABS_VOICE_ID
ARG NEXT_PUBLIC_ELEVENLABS_API_URL

ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_GEMINI_API_KEY=${NEXT_PUBLIC_GEMINI_API_KEY}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_ELEVENLABS_API_KEY=${NEXT_PUBLIC_ELEVENLABS_API_KEY}
ENV NEXT_PUBLIC_ELEVENLABS_VOICE_ID=${NEXT_PUBLIC_ELEVENLABS_VOICE_ID}
ENV NEXT_PUBLIC_ELEVENLABS_API_URL=${NEXT_PUBLIC_ELEVENLABS_API_URL}

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production --legacy-peer-deps

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]