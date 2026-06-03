# Build context = repo root (so the @fems/shared file: dependency resolves).
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/reporting-service/package.json ./services/reporting-service/package.json
WORKDIR /app/services/reporting-service
RUN npm install --omit=dev --install-links
COPY services/reporting-service/src ./src
EXPOSE 4004
CMD ["node", "src/server.js"]
