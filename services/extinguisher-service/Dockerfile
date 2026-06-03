# Build context = repo root (so the @fems/shared file: dependency resolves).
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/extinguisher-service/package.json ./services/extinguisher-service/package.json
WORKDIR /app/services/extinguisher-service
RUN npm install --omit=dev --install-links
COPY services/extinguisher-service/src ./src
EXPOSE 4002
CMD ["node", "src/server.js"]
