FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/server/package.json apps/server/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY . .
WORKDIR /app/apps/server
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]
