# Builds the TypeScript backend and runs its production output in Node.js.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY tsconfig.base.json ./tsconfig.base.json
COPY backend/tsconfig.json backend/tsconfig.build.json ./backend/
COPY backend/src ./backend/src
COPY shared/src ./shared/src

RUN npm run build --workspace @mini-survey/backend

FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --omit=dev --workspace @mini-survey/backend --include-workspace-root=false \
  && npm cache clean --force

COPY --from=build --chown=node:node /app/backend/dist ./backend/dist

USER node

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
