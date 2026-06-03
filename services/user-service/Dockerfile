# Build context = repo root (so the @fems/shared file: dependency resolves).
FROM node:20-alpine
WORKDIR /app

# Shared library first (own deps), then the service.
COPY shared ./shared
COPY services/user-service/package.json ./services/user-service/package.json
WORKDIR /app/services/user-service
# --install-links copies the @fems/shared file: dependency in (with its own
# deps) instead of symlinking, so module resolution works at runtime.
RUN npm install --omit=dev --install-links
COPY services/user-service/src ./src

EXPOSE 4001
CMD ["node", "src/server.js"]
