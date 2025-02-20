# Development stage
FROM node:16 AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Production stage
FROM node:16
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install --production

# Copy source files and examples
COPY src/ ./src/
COPY examples/ ./examples/

# Add environment configuration
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

EXPOSE 5193
CMD ["npm", "start"]
