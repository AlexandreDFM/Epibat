# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ARG API_BACKEND_URL=http://localhost:4000
ENV API_BACKEND_URL=${API_BACKEND_URL}

# Copy workspace root
COPY package.json pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY packages/shared packages/shared
COPY apps/web apps/web

# Build shared package
RUN pnpm --filter @epibat/shared build

# Build Next.js
RUN pnpm --filter @epibat/web build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
