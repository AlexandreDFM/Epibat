# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root
COPY package.json pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY packages/shared packages/shared
COPY apps/server apps/server

# Build shared package
RUN pnpm --filter @epibat/shared build

# Generate Prisma Client
RUN pnpm --filter @epibat/server db:generate

# Build server
RUN pnpm --filter @epibat/server build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Network tools needed by the scanner (ARP, ping, traceroute)
RUN apk add --no-cache net-tools iputils-ping busybox-extras iproute2

WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from builder (hoisted flat structure)
COPY --from=builder /app/node_modules ./node_modules

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Also place shared in node_modules (workspace symlink doesn't survive Docker COPY)
COPY --from=builder /app/packages/shared/dist ./node_modules/@epibat/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@epibat/shared/

# Copy built server + prisma schema
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma

EXPOSE 4000

CMD ["node", "apps/server/dist/index.js"]
