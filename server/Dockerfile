# Use a lightweight Node.js environment
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to cache dependencies and speed up future builds
COPY package*.json ./
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the Express/Socket.io port
EXPOSE 5000

# Boot the server
CMD ["node", "server.js"]