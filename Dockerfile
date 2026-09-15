# syntax=docker/dockerfile:1
FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ui-spec/package.json packages/ui-spec/package.json
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build && cp -r apps/api/src/database/migrations apps/api/dist/database/migrations

FROM dependencies AS browser-dependencies
RUN npx playwright install --with-deps chromium

FROM browser-dependencies AS test
COPY --from=build /app /app
RUN npm run build-storybook
CMD ["sh", "-c", "npm run lint && npm run typecheck && npm test && npm run test:api && npm run test:e2e && npm run test:stories"]

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/ui-spec/package.json ./packages/ui-spec/package.json
COPY --from=build /app/packages/ui-spec/dist ./packages/ui-spec/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

FROM nginx:stable-alpine@sha256:dc5069ad14f19660b141b21236140b91656bf89bbc3e2417c70ae650cd66104c AS nginx
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
