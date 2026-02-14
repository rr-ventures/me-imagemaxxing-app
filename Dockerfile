# Use Node 20 for better-sqlite3 and Next.js
FROM node:20-bookworm-slim AS base

# Install python for node-gyp (better-sqlite3 native build)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies
COPY package.json ./
RUN npm install

# Source and build
COPY . .
RUN npm run build

# Production: run Next.js listening on all interfaces so Railway can reach it
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Use shell so $PORT from Railway is picked up
CMD node node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}
