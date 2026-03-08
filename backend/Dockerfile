FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js drizzle.config.js ./
COPY db ./db
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services
COPY solana ./solana

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
