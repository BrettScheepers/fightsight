# Multi-stage build for Node.js API service

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 3000

# Generate Prisma Client and start dev server
CMD sh -c "npm run db:generate && npm run dev"

# Production build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies and built files
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
