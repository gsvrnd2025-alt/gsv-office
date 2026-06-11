# ─────────────────────────────────────────
# GSV Office Frontend — Docker Build
# Optimized production image copying pre-compiled local build
# ─────────────────────────────────────────

FROM nginx:1.25-alpine AS production

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
