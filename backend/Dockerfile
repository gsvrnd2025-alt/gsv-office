# ─────────────────────────────────────────
# GSV Office Backend — Docker Build
# Optimized production image copying pre-compiled local build
# ─────────────────────────────────────────

FROM node:20-alpine AS production

WORKDIR /app

# Install runtime and compilation dependencies for native modules
RUN apk add --no-cache libc6-compat samba-client curl python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only (compiles native addons for alpine)
RUN npm ci --only=production

# Copy pre-compiled dist folder from host
COPY dist ./dist

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
