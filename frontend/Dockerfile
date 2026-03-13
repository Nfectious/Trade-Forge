# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept optional build argument overrides.
# NEXT_PUBLIC_* values are normally read from .env.production (copied below).
# Only declare ARGs here; setting ENV from an unset ARG would write an empty
# string that overrides the .env.production file and breaks the build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

# Copy package files
COPY package*.json ./
# Remove or comment out the yarn.lock line
# COPY yarn.lock* ./   ← delete or comment this

RUN npm install

# Copy source code
COPY . .

# Ensure public directory exists (may not be present in source)
RUN mkdir -p /app/public

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
