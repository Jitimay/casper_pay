# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
# Use npm ci for faster, more reliable builds
RUN npm ci

COPY . .

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy dependencies and source code from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app .

# Expose the relayer port
EXPOSE 3001

# IMPORTANT: In a real production environment, you should pass secrets
# and configuration via environment variables at runtime, not by
# including the .env file in the image.
# Example: docker run -e "CASPER_NODE_URL=..." -e "MAINNET_PUBLIC_KEY=..." ...
# For this example, we copy the .env file for simplicity.
COPY .env .

# Start the relayer with pm2-runtime
# This is the recommended way to run PM2 in a container
CMD ["pm2-runtime", "index.js", "--name", "casperpay-relayer"]
