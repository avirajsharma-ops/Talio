# ============================================
# Talio HRMS - Production Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install build dependencies including vips for sharp
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev \
    fftw-dev \
    build-base

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies with sharp platform config
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
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

# Expose port
EXPOSE 3000

# Start the application using npm start (which runs node server.js)
CMD ["npm", "start"]