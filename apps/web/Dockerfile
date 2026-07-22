FROM node:24-bookworm-slim AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci
RUN mkdir -p apps/web/node_modules

FROM node:24-bookworm-slim AS builder
WORKDIR /workspace

ARG NEXT_PUBLIC_TEXTPLEX_API_URL=http://127.0.0.1:8201
ARG NEXT_PUBLIC_TEXTPLEX_DEMO_MODE=false
ARG NEXT_PUBLIC_TEXTPLEX_LEGACY_URL=http://127.0.0.1:8200/legacy/index.html
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_TEXTPLEX_API_URL=$NEXT_PUBLIC_TEXTPLEX_API_URL
ENV NEXT_PUBLIC_TEXTPLEX_DEMO_MODE=$NEXT_PUBLIC_TEXTPLEX_DEMO_MODE
ENV NEXT_PUBLIC_TEXTPLEX_LEGACY_URL=$NEXT_PUBLIC_TEXTPLEX_LEGACY_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN npm run build:web

FROM node:24-bookworm-slim AS runner
WORKDIR /workspace
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/package-lock.json ./package-lock.json
COPY --from=builder /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=builder /workspace/apps/web/eslint.config.mjs ./apps/web/eslint.config.mjs
COPY --from=builder /workspace/apps/web/.next ./apps/web/.next
COPY --from=builder /workspace/apps/web/app ./apps/web/app
COPY --from=builder /workspace/apps/web/components ./apps/web/components
COPY --from=builder /workspace/apps/web/lib ./apps/web/lib
COPY --from=builder /workspace/apps/web/scripts ./apps/web/scripts

EXPOSE 3000

CMD ["npm", "--workspace", "apps/web", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
