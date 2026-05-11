# Monolith API — workspace install from repository root (see docker-compose build context).
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# Include devDependencies so `tsx` is available for `node --import tsx` (see backend/package.json).
RUN npm ci -w backend

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/server ./backend/server
WORKDIR /app
EXPOSE 3847
CMD ["npm", "run", "start", "-w", "backend"]
