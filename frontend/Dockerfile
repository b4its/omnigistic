# syntax=docker/dockerfile:1

# ---- Builder (full install utk vite + svelte-kit) ----
FROM node:22-slim AS build
WORKDIR /app
# layer cache: lock dulu
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --loglevel=error
COPY . .
# var public yg di-inline ke bundle client saat build (browser)
ENV PUBLIC_API_BASE_URL=http://127.0.0.1:8077
RUN npm run build

# ---- Runner (only: build adapter-node + node_modules runtime untuk SSR dep) ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3077
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3077
CMD ["node", "build/index.js"]