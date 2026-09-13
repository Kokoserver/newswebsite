# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json ./

RUN PM="$(node -p 'const p=require("./package.json").packageManager||""; p')" \
  && if [ -z "$PM" ]; then corepack enable; else \
    downloaded=0; \
    for i in $(seq 1 10); do \
      if corepack prepare "$PM" --activate; then echo "corepack prepared $PM"; downloaded=1; break; fi; \
      echo "corepack download attempt $i failed, retrying in 5s"; sleep 5; \
    done; \
    if [ "$downloaded" -ne 1 ]; then echo "corepack: giving up on $PM"; exit 1; fi; \
    corepack enable; \
  fi

FROM base AS dependencies

COPY pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-timeout 600000 \
  && pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache dumb-init \
  && corepack enable \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker ./docker
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

RUN chmod +x ./docker/entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker/entrypoint.sh"]
