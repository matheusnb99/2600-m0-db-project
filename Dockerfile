# syntax=docker/dockerfile:1
# ============================================================================
# BLACKVAULT / TAJ — image du site (Next.js standalone, multi-étages)
# Une seule image, déployée N fois avec un DB_USER différent (cf. compose).
# ============================================================================
ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# Étape 1 — deps : installe node_modules (couche mise en cache tant que le
# lockfile ne change pas).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Étape 2 — builder : compile le serveur "standalone".
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---------------------------------------------------------------------------
# Étape 3 — runner : image finale minimale, exécutée en utilisateur NON-root.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# L'utilisateur 'node' (uid 1000) est fourni par l'image de base : on ne tourne
# jamais en root. On ne copie que la sortie standalone (pas de node_modules
# complet, pas de sources, pas de .env).
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# Healthcheck sans dépendance externe (fetch natif de Node 22).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
