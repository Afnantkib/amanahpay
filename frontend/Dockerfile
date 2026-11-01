FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_USE_MOCKS=false
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine
ARG API_PROXY_UPSTREAM=http://backend:8080/api/
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s|__API_PROXY_UPSTREAM__|${API_PROXY_UPSTREAM}|g" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
