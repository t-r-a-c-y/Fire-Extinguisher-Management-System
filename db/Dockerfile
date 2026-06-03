# One-shot container that applies migrations + seed against the postgres service.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
# Run migrations then seed.
CMD ["sh", "-c", "node migrate.js && node seed.js"]
