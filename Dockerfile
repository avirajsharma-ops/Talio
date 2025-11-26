# Use the official Node.js 20 Alpine image (required for Firebase)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for building (including for sharp and native modules)
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Use --legacy-peer-deps to avoid peer dependency conflicts
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Copy environment files
COPY .env* ./

# Create .env.local from .env for Next.js build process
RUN if [ -f .env ]; then cp .env .env.local; fi

# Set build-time environment variables (only for NEXT_PUBLIC_ vars that get embedded)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID
# Maya AI build arguments
ARG NEXT_PUBLIC_OPENAI_API_KEY
ARG NEXT_PUBLIC_OPENAI_MODEL
ARG NEXT_PUBLIC_OPENAI_API_URL
ARG NEXT_PUBLIC_ELEVENLABS_API_KEY
ARG NEXT_PUBLIC_ELEVENLABS_VOICE_ID
ARG NEXT_PUBLIC_ELEVENLABS_API_URL
ARG NEXT_PUBLIC_TAVILY_API_KEY
ARG NEXT_PUBLIC_GEMINI_API_KEY

# Set environment variables for build
ENV NODE_ENV=production
# Only set NEXT_PUBLIC_ vars during build (these get embedded in the client bundle)
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-HRMS}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_ONESIGNAL_APP_ID=${NEXT_PUBLIC_ONESIGNAL_APP_ID}
# Maya AI environment variables
ENV NEXT_PUBLIC_OPENAI_API_KEY=${NEXT_PUBLIC_OPENAI_API_KEY}
ENV NEXT_PUBLIC_OPENAI_MODEL=${NEXT_PUBLIC_OPENAI_MODEL:-gpt-4o}
ENV NEXT_PUBLIC_OPENAI_API_URL=${NEXT_PUBLIC_OPENAI_API_URL:-https://api.openai.com/v1/chat/completions}
ENV NEXT_PUBLIC_ELEVENLABS_API_KEY=${NEXT_PUBLIC_ELEVENLABS_API_KEY}
ENV NEXT_PUBLIC_ELEVENLABS_VOICE_ID=${NEXT_PUBLIC_ELEVENLABS_VOICE_ID}
ENV NEXT_PUBLIC_ELEVENLABS_API_URL=${NEXT_PUBLIC_ELEVENLABS_API_URL:-https://api.elevenlabs.io/v1/text-to-speech/}
ENV NEXT_PUBLIC_TAVILY_API_KEY=${NEXT_PUBLIC_TAVILY_API_KEY}
ENV NEXT_PUBLIC_GEMINI_API_KEY=${NEXT_PUBLIC_GEMINI_API_KEY}

# Build the application (without connecting to database)
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
