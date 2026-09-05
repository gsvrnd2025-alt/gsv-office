# ─────────────────────────────────────────
# GSV Office Backend — Docker Build
# Multi-stage for production optimization
# ─────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source
COPY src ./src

# Build
RUN npm run build

# ─────────────────────────────────────────
# Production stage
# ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache libc6-compat samba-client curl

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/plugins /tmp/uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app/uploads /app/logs /app/plugins /tmp/uploads

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
