#!/bin/bash

# Kiro OSS Map API Gateway Deployment Script
# Version: 2.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
MONITORING_FILE="docker-compose.monitoring.yml"

if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo -e "${BLUE}🚀 Kiro OSS Map API Gateway Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Compose file: ${COMPOSE_FILE}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Check environment file
if [ "$ENVIRONMENT" = "production" ] && [ ! -f ".env.production" ]; then
    print_error "Production environment file (.env.production) not found"
    exit 1
fi

# Build and deploy
echo -e "\n${BLUE}🔨 Building and deploying services...${NC}"

# Stop existing services
echo "Stopping existing services..."
docker-compose -f $COMPOSE_FILE down --remove-orphans

# Build images
echo "Building Docker images..."
docker-compose -f $COMPOSE_FILE build --no-cache

# Start services
echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "\n${BLUE}🏥 Waiting for services to be healthy...${NC}"

# Function to wait for service
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s $url > /dev/null 2>&1; then
            print_status "$service is ready"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start within expected time"
    return 1
}

# Wait for API Gateway
wait_for_service "API Gateway" "http://localhost:3000/health"

# Run health checks
echo -e "\n${BLUE}🔍 Running health checks...${NC}"

# API Gateway health check
if curl -f -s http://localhost:3000/health | jq -e '.status == "healthy"' > /dev/null; then
    print_status "API Gateway health check passed"
else
    print_error "API Gateway health check failed"
    exit 1
fi

# Database health check
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U kiro_user > /dev/null; then
    print_status "PostgreSQL health check passed"
else
    print_error "PostgreSQL health check failed"
    exit 1
fi

# Redis health check
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping | grep -q PONG; then
    print_status "Redis health check passed"
else
    print_error "Redis health check failed"
    exit 1
fi

# Deploy monitoring (optional)
if [ "$2" = "--with-monitoring" ]; then
    echo -e "\n${BLUE}📊 Deploying monitoring stack...${NC}"
    docker-compose -f $MONITORING_FILE up -d
    
    wait_for_service "Prometheus" "http://localhost:9090/-/healthy"
    wait_for_service "Grafana" "http://localhost:3001/api/health"
    
    print_status "Monitoring stack deployed"
    echo -e "${YELLOW}Grafana URL: http://localhost:3001 (admin/secure_grafana_password_change_this)${NC}"
    echo -e "${YELLOW}Prometheus URL: http://localhost:9090${NC}"
fi

# Show service status
echo -e "\n${BLUE}📊 Service Status:${NC}"
docker-compose -f $COMPOSE_FILE ps

# Show logs
echo -e "\n${BLUE}📝 Recent logs:${NC}"
docker-compose -f $COMPOSE_FILE logs --tail=20

# Success message
echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}API Gateway is running at: http://localhost:3000${NC}"
echo -e "${GREEN}API Documentation: http://localhost:3000/api/v2${NC}"
echo -e "${GREEN}Health Check: http://localhost:3000/health${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "Remember to:"
    print_warning "1. Update SSL certificates in ./ssl/ directory"
    print_warning "2. Change default passwords in .env.production"
    print_warning "3. Configure proper DNS records"
    print_warning "4. Set up backup procedures"
    print_warning "5. Configure log rotation"
fi

echo -e "\n${BLUE}📚 Useful commands:${NC}"
echo "View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "Stop services: docker-compose -f $COMPOSE_FILE down"
echo "Restart service: docker-compose -f $COMPOSE_FILE restart api-gateway"
echo "Scale API Gateway: docker-compose -f $COMPOSE_FILE up -d --scale api-gateway=3"