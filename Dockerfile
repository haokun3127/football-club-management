FROM docker.1ms.run/library/node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @football-club/domain build && pnpm --filter @football-club/api build

FROM docker.1ms.run/library/node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/domain/dist packages/domain/dist

RUN mkdir -p /var/lib/cq-talent
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
