# Dockerfile for JobMatch AI Frontend
# Multi-stage build for Vite React app

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install if package-lock.json doesn't exist)
RUN npm install

# Copy source files
COPY . .

# Accept build arguments from Railway
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_BACKEND_URL
ARG VITE_APP_NAME
ARG VITE_ENV
ARG VITE_LINKEDIN_CLIENT_ID
ARG VITE_LINKEDIN_REDIRECT_URI

# Set as environment variables for Vite build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_ENV=$VITE_ENV
ENV VITE_LINKEDIN_CLIENT_ID=$VITE_LINKEDIN_CLIENT_ID
ENV VITE_LINKEDIN_REDIRECT_URI=$VITE_LINKEDIN_REDIRECT_URI

# Build the Vite app (now has access to VITE_* env vars)
RUN npm run build

# Stage 2: Serve with a lightweight static server
FROM node:20-alpine

WORKDIR /app

# Copy built files and server from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

# Expose port
EXPOSE 3000

# Start custom Node server that explicitly reads PORT env var
CMD ["node", "server.js"]
