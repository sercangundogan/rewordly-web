FROM node:18-alpine

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

# Start Next.js server
CMD ["npm", "start"]

