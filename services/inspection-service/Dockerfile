# Build context = repo root (so the @fems/shared file: dependency resolves).
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/inspection-service/package.json ./services/inspection-service/package.json
WORKDIR /app/services/inspection-service
RUN npm install --omit=dev --install-links
COPY services/inspection-service/src ./src
EXPOSE 4003
CMD ["node", "src/server.js"]
