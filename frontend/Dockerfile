# Production SPA + nginx reverse proxy to the API (same-origin /api for cookies).
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci -w frontend
COPY frontend ./frontend
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.docker.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
