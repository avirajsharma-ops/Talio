# Use the official Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Copy environment files
COPY .env* ./

# Create .env.local from .env for Next.js build process
RUN if [ -f .env ]; then cp .env .env.local; fi

# Set build-time environment variables
ARG MONGODB_URI
ARG JWT_SECRET
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME

# Set environment variables for build
ENV NODE_ENV=production
# Use dummy values for build if not provided (actual values will be set at runtime)
ENV MONGODB_URI=${MONGODB_URI:-mongodb://dummy:27017/dummy}
ENV JWT_SECRET=${JWT_SECRET:-dummy-jwt-secret-for-build}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-dummy-nextauth-secret-for-build}
ENV NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-HRMS}

# Build the application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
