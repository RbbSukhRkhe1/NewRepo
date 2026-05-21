# Production SPA + nginx reverse proxy to the API (same-origin /api for cookies).
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
# Deploy hosts often hit transient ECONNRESET during registry fetch (same mitigations as backend).
ENV npm_config_fetch_retries=10
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000
RUN npm ci -w frontend \
  || (echo "npm ci retry 1…" && sleep 8 && npm ci -w frontend) \
  || (echo "npm ci retry 2…" && sleep 20 && npm ci -w frontend)
COPY frontend ./frontend
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.docker.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
