# Dockerfile
FROM node:20-alpine AS base

# Install Foundry (for contracts)
RUN apk add --no-cache curl git && \
    curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --include=dev

# Copy everything
COPY . .

# Build contracts
RUN cd contracts && forge build

# Build frontend for production (optional)
RUN npm run build

EXPOSE 5173 3000
CMD ["npm", "run", "dev"]