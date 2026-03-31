# WhatsApp Bridge Dockerfile for Railway
FROM node:20-alpine

# Install Chromium for whatsapp-web.js
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer/Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV LD_LIBRARY_PATH=/usr/lib

# NOTE: Do NOT set ENV PORT here — Railway injects PORT dynamically at runtime.
# The server defaults to 3001 if PORT is not set (local development only).

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directories for sessions and auth
RUN mkdir -p sessions .wwebjs_auth .wwebjs_cache

# Run as non-root user for security
RUN chown -R node:node /app
USER node

# Expose default port (Railway overrides this with its own PORT)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# Start the bridge server (bind to 0.0.0.0 for Railway)
CMD ["node", "bridge-server.js"]
