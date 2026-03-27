FROM node:current-alpine AS development

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# Prevent Husky hooks from running during container installs.
ENV HUSKY=0

# Copy only dependency manifests first to maximize Docker layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app-service/package.json ./app-service/package.json

# Install deps for app-service and its local workspace dependencies.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter app-service...

# Copy service source after dependency install cache is established.
COPY app-service ./app-service

WORKDIR /workspace/app-service
EXPOSE 3000

# Build image: compiles Nest app and migration artifacts into /dist.
FROM node:current-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace
ENV HUSKY=0

# Reuse the same install strategy to keep build stage deterministic.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app-service/package.json ./app-service/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --filter app-service...

COPY app-service ./app-service
WORKDIR /workspace/app-service

# build:all = Nest build + knex/migration TypeScript build.
RUN pnpm build:all

# Runtime image: smallest stage with prod deps + compiled output only.
FROM node:current-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

ENV NODE_ENV=production
ENV HUSKY=0

# Run as non-root user for better container security posture.
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Install only production dependencies required at runtime.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app-service/package.json ./app-service/package.json
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter app-service... && pnpm store prune

WORKDIR /workspace/app-service
# Copy compiled app + migrations from build stage.
COPY --from=build --chown=nestjs:nodejs /workspace/app-service/dist ./dist

USER nestjs
EXPOSE 3000

# Apply pending migrations on boot, then start the NestJS server.
CMD ["sh", "-c", "pnpm migrate:latest --knexfile=./dist/knexfile.js && pnpm start:prod"]
