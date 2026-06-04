# ─────────────────────────────────────────
# GSV Office Frontend — Docker Build
# Multi-stage: build with Node, serve with nginx
# ─────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

RUN npm ci

COPY src ./src
COPY public ./public

RUN npm run build

# ─────────────────────────────────────────
# Production: Nginx to serve built files
# ─────────────────────────────────────────
FROM nginx:1.25-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
