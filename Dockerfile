FROM node:18-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

COPY .env.example .env

RUN pnpm run build

FROM node:18-alpine

RUN npm install -g pnpm

# this for using pg_ready
RUN apk add --no-cache postgresql-client bash

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

RUN pnpm add drizzle-kit

ENV PATH="/app/node_modules/.bin:$PATH"

RUN mkdir -p src

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts/startup.sh ./startup.sh
COPY --from=builder /app/src/env.js ./src/env.js

RUN chmod +x ./startup.sh

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["./startup.sh"]
