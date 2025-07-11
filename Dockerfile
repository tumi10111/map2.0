# Use official Node.js 18 image (LTS)
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if exists
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the app source code
COPY . .

# Expose port the app listens on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
