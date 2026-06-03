# Build context = repo root (so the @fems/shared file: dependency resolves).
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/notification-service/package.json ./services/notification-service/package.json
WORKDIR /app/services/notification-service
RUN npm install --omit=dev --install-links
COPY services/notification-service/src ./src
EXPOSE 4005
CMD ["node", "src/server.js"]
