# Use a larger image for build to avoid memory issues
FROM --platform=${BUILDPLATFORM:-linux/amd64} node:18-bullseye AS builder

# Set working directory
WORKDIR /app

# Create the public directory if it doesn't exist
RUN mkdir -p /app/public

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the app with more memory allocated
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Production stage - uses the target platform architecture
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:18-alpine AS production

# Set working directory
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from build stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tailwind.config.ts ./
COPY --from=builder /app/postcss.config.js ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
