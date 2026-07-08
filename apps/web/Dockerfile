FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY . .

RUN npm run build:web

FROM node:20-bookworm-slim AS runner
WORKDIR /workspace
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/package-lock.json ./package-lock.json
COPY --from=builder /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=builder /workspace/apps/web/.next ./apps/web/.next
COPY --from=builder /workspace/apps/web/app ./apps/web/app
COPY --from=builder /workspace/apps/web/components ./apps/web/components
COPY --from=builder /workspace/apps/web/lib ./apps/web/lib

EXPOSE 3000

CMD ["npm", "--workspace", "apps/web", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
