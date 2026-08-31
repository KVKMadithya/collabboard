# Use a lightweight Node.js environment
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Run Vite and expose it to the local network so your browser can reach it
CMD ["npm", "run", "dev", "--", "--host"]