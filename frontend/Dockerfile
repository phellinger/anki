# Development stage
FROM node:16 AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]

# Production stage
FROM node:16
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install --production

# Copy source files needed for build
COPY src/ ./src/
COPY public/ ./public/

# Add build argument
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build
EXPOSE 3123
CMD ["npm", "run", "serve"]
