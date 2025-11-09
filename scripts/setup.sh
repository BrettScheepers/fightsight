#!/bin/bash

# FightSight Setup Script
# Initializes the development environment

set -e

echo "🥊 FightSight Setup"
echo "==================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please edit .env and add your API keys before continuing${NC}"
    echo ""
    read -p "Press enter when you've added your API keys..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check Docker
echo ""
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Install root dependencies
echo ""
echo "Installing root dependencies..."
npm install
echo -e "${GREEN}✓ Root dependencies installed${NC}"

# Create necessary directories
echo ""
echo "Creating necessary directories..."
mkdir -p services/api services/cv-service services/web
mkdir -p packages/shared-types packages/config
mkdir -p infrastructure/postgres/init-scripts infrastructure/redis infrastructure/nginx
echo -e "${GREEN}✓ Directories created${NC}"

# Pull Docker images
echo ""
echo "Pulling Docker images (this may take a few minutes)..."
docker-compose pull
echo -e "${GREEN}✓ Docker images pulled${NC}"

# Build services
echo ""
echo "Building services..."
echo -e "${YELLOW}Note: This will show errors for services not yet created. That's expected.${NC}"
docker-compose build || true
echo -e "${GREEN}✓ Build attempted (some services may need implementation)${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup Complete! 🎉${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure your .env file has all required API keys"
echo "2. Implement service scaffolding (run 'npm run dev' to see what's missing)"
echo "3. Start development with: npm run dev"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start all services in development mode"
echo "  npm run dev:build    - Rebuild and start services"
echo "  npm run logs         - View all service logs"
echo "  npm run stop         - Stop all services"
echo "  npm run clean        - Stop services and remove volumes"
echo ""
