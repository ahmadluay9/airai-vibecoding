# Use Node.js for building the application
FROM node:24-slim AS build-stage

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Set default build-time environment variables as placeholders
ENV VITE_API_KEY=PLACEHOLDER_VITE_API_KEY
ENV VITE_GEMINI_API_KEY=PLACEHOLDER_VITE_GEMINI_API_KEY

# Build the application (which embeds the placeholder strings into the bundled JS files)
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:alpine

# Copy built files from the build stage to Nginx's serve directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Cloud Run requires the container to listen on the port defined by the PORT environment variable.
# We'll use a custom Nginx configuration that supports this.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Use a shell script to replace the $PORT placeholder in the nginx config,
# replace the API key placeholders in the compiled JS files with the runtime environment variables,
# and then start nginx.
CMD ["/bin/sh", "-c", "sed -i \"s/8080/$PORT/g\" /etc/nginx/conf.d/default.conf && find /usr/share/nginx/html -type f -name '*.js' -exec sed -i \"s|PLACEHOLDER_VITE_API_KEY|$VITE_API_KEY|g\" {} + && find /usr/share/nginx/html -type f -name '*.js' -exec sed -i \"s|PLACEHOLDER_VITE_GEMINI_API_KEY|$VITE_GEMINI_API_KEY|g\" {} + && nginx -g 'daemon off;'"]
