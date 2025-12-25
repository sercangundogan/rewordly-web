FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

EXPOSE 3000

# Set environment variables for Next.js
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start Next.js server
CMD ["npm", "start"]

