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

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

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
