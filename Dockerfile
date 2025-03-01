# Base image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Create the public directory if it doesn't exist
RUN mkdir -p /app/public

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Configure next.js to use babel when SWC is not available
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_WEBPACK_USEPOLLING 1
ENV NEXT_SWC_MINIFY 0

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy necessary files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
# Make sure we copy these additional files
COPY --from=build /app/next.config.js ./
COPY --from=build /app/tailwind.config.ts ./
COPY --from=build /app/postcss.config.js ./

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
