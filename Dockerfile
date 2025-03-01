# Base image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Create the public directory if it doesn't exist
RUN mkdir -p /app/public

# Copy package.json and package-lock.json
COPY package*.json ./

# Set environment variables (using correct format)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_WEBPACK_USEPOLLING=1
# Completely disable SWC to avoid architecture-specific issues
ENV SWCRC=false
ENV NODE_OPTIONS="--max_old_space_size=4096"

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Create .babelrc to ensure Babel is used instead of SWC
RUN echo '{"presets": ["next/babel"]}' > .babelrc

# Create jsconfig.json to disable SWC
RUN echo '{"compilerOptions": {"jsx": "preserve"}}' > jsconfig.json

# Modify next.config.js to disable SWC completely
RUN sed -i 's/const nextConfig = {/const nextConfig = {\n  swcMinify: false,\n  compiler: {\n    styledComponents: true\n  },/' next.config.js

# Install babel dependencies needed for ARM builds
RUN npm install --save-dev @babel/core @babel/preset-env @babel/preset-react babel-loader

# Build the app
RUN npm run build || (echo "Build failed. See error above." && exit 1)

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Set environment variables for production (using correct format)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
