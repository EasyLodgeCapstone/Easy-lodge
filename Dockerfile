# Use a slim and recent Node.js LTS version for a smaller image size
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker's build cache.
# This step is only re-run when these files change.
# Make sure you have package.json and package-lock.json in your project root.
COPY package*.json ./

# Install production dependencies using 'npm ci' for deterministic builds
RUN npm ci --only=production

# Copy the rest of your application's source code from your project root to the container
COPY . .

# Expose the port your app runs on as defined in server.js
EXPOSE 3000

# Define the command to start your application
CMD [ "node", "src/server.js" ]