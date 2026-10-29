FROM docker.1ms.run/library/node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY apps/api/package.json apps/api/package.json
COPY apps/backoffice/package.json apps/backoffice/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @football-club/domain build && pnpm --filter @football-club/api build && pnpm --filter @football-club/backoffice build
ARG FCM_SOURCE_REVISION
ARG FCM_BUILD_ID
ARG FCM_BUILT_AT
RUN node scripts/delivery/write-server-artifact.mjs

FROM docker.1ms.run/library/node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ARG FCM_SOURCE_REVISION
ARG FCM_BUILD_ID
ARG FCM_BUILT_AT
LABEL org.opencontainers.image.revision=$FCM_SOURCE_REVISION \
      org.opencontainers.image.version=$FCM_BUILD_ID \
      org.opencontainers.image.created=$FCM_BUILT_AT

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY apps/api/package.json apps/api/package.json
COPY apps/backoffice/package.json apps/backoffice/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/backoffice/dist apps/backoffice/dist
COPY --from=build /app/apps/api/db/migrations apps/api/db/migrations
COPY --from=build /app/apps/api/backoffice apps/api/backoffice
COPY --from=build /app/packages/domain/dist packages/domain/dist
COPY --from=build /app/apps/api/build-metadata.json apps/api/build-metadata.json
COPY --from=build /app/server-artifact.json server-artifact.json

RUN mkdir -p /var/lib/cq-talent \
    && chmod -R a+rX /app/apps /app/packages \
    && chmod a+r /app/server-artifact.json
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
