# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN chmod +x ./scripts/docker-entrypoint.sh \
  && mkdir -p uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

VOLUME ["/app/uploads"]

ENTRYPOINT ["/sbin/tini", "--", "./scripts/docker-entrypoint.sh"]
