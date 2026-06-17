# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /app

# Needed by some Node modules on Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci


FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Install only production deps (smaller image than copying full node_modules)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# If you rely on runtime envs for rewrites/proxy, pass them at `docker run` time:
#   -e NEXT_PUBLIC_API_URL=...
#   -e BACKEND_PROXY_URL=...

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
