# Builds the Vite frontend and serves its production assets with Nginx.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci

COPY tsconfig.base.json ./tsconfig.base.json
COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./frontend/
COPY frontend/src ./frontend/src
COPY shared/src ./shared/src

ARG VITE_API_URL=/api

RUN npm run build --workspace @mini-survey/frontend

FROM nginx:1.29-alpine AS production

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
