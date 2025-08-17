# Kiro OSS Map API Gateway Deployment Script (PowerShell)
# Version: 2.0.0

param(
    [string]$Environment = "production",
    [switch]$WithMonitoring
)

# Configuration
$ComposeFile = "docker-compose.yml"
$MonitoringFile = "docker-compose.monitoring.yml"

if ($Environment -eq "production") {
    $ComposeFile = "docker-compose.prod.yml"
}

Write-Host "🚀 Kiro OSS Map API Gateway Deployment" -ForegroundColor Blue
Write-Host "Environment: $Environment" -ForegroundColor Blue
Write-Host "Compose file: $ComposeFile" -ForegroundColor Blue

# Function to print status
function Write-Status {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Blue

try {
    docker --version | Out-Null
    Write-Status "Docker is available"
} catch {
    Write-Error "Docker is not installed or not in PATH"
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Status "Docker Compose is available"
} catch {
    Write-Error "Docker Compose is not installed or not in PATH"
    exit 1
}

# Check environment file
if ($Environment -eq "production" -and -not (Test-Path ".env.production")) {
    Write-Error "Production environment file (.env.production) not found"
    exit 1
}

# Build and deploy
Write-Host "`n🔨 Building and deploying services..." -ForegroundColor Blue

# Stop existing services
Write-Host "Stopping existing services..."
docker-compose -f $ComposeFile down --remove-orphans

# Build images
Write-Host "Building Docker images..."
docker-compose -f $ComposeFile build --no-cache

# Start services
Write-Host "Starting services..."
docker-compose -f $ComposeFile up -d

# Wait for services to be healthy
Write-Host "`n🏥 Waiting for services to be healthy..." -ForegroundColor Blue

# Function to wait for service
function Wait-ForService {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$MaxAttempts = 30
    )
    
    Write-Host "Waiting for $ServiceName to be ready..."
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Status "$ServiceName is ready"
                return $true
            }
        } catch {
            # Service not ready yet
        }
        
        Write-Host "Attempt $attempt/$MaxAttempts - $ServiceName not ready yet..."
        Start-Sleep -Seconds 10
    }
    
    Write-Error "$ServiceName failed to start within expected time"
    return $false
}

# Wait for API Gateway
if (-not (Wait-ForService "API Gateway" "http://localhost:3000/health")) {
    exit 1
}

# Run health checks
Write-Host "`n🔍 Running health checks..." -ForegroundColor Blue

# API Gateway health check
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -UseBasicParsing
    if ($healthResponse.status -eq "healthy") {
        Write-Status "API Gateway health check passed"
    } else {
        Write-Error "API Gateway health check failed"
        exit 1
    }
} catch {
    Write-Error "API Gateway health check failed: $($_.Exception.Message)"
    exit 1
}

# Database health check
try {
    $dbCheck = docker-compose -f $ComposeFile exec -T postgres pg_isready -U kiro_user
    if ($LASTEXITCODE -eq 0) {
        Write-Status "PostgreSQL health check passed"
    } else {
        Write-Error "PostgreSQL health check failed"
        exit 1
    }
} catch {
    Write-Error "PostgreSQL health check failed"
    exit 1
}

# Redis health check
try {
    $redisCheck = docker-compose -f $ComposeFile exec -T redis redis-cli ping
    if ($redisCheck -match "PONG") {
        Write-Status "Redis health check passed"
    } else {
        Write-Error "Redis health check failed"
        exit 1
    }
} catch {
    Write-Error "Redis health check failed"
    exit 1
}

# Deploy monitoring (optional)
if ($WithMonitoring) {
    Write-Host "`n📊 Deploying monitoring stack..." -ForegroundColor Blue
    docker-compose -f $MonitoringFile up -d
    
    if ((Wait-ForService "Prometheus" "http://localhost:9090/-/healthy") -and 
        (Wait-ForService "Grafana" "http://localhost:3001/api/health")) {
        Write-Status "Monitoring stack deployed"
        Write-Warning "Grafana URL: http://localhost:3001 (admin/secure_grafana_password_change_this)"
        Write-Warning "Prometheus URL: http://localhost:9090"
    }
}

# Show service status
Write-Host "`n📊 Service Status:" -ForegroundColor Blue
docker-compose -f $ComposeFile ps

# Show logs
Write-Host "`n📝 Recent logs:" -ForegroundColor Blue
docker-compose -f $ComposeFile logs --tail=20

# Success message
Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "API Gateway is running at: http://localhost:3000" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:3000/api/v2" -ForegroundColor Green
Write-Host "Health Check: http://localhost:3000/health" -ForegroundColor Green

if ($Environment -eq "production") {
    Write-Warning "Remember to:"
    Write-Warning "1. Update SSL certificates in ./ssl/ directory"
    Write-Warning "2. Change default passwords in .env.production"
    Write-Warning "3. Configure proper DNS records"
    Write-Warning "4. Set up backup procedures"
    Write-Warning "5. Configure log rotation"
}

Write-Host "`n📚 Useful commands:" -ForegroundColor Blue
Write-Host "View logs: docker-compose -f $ComposeFile logs -f"
Write-Host "Stop services: docker-compose -f $ComposeFile down"
Write-Host "Restart service: docker-compose -f $ComposeFile restart api-gateway"
Write-Host "Scale API Gateway: docker-compose -f $ComposeFile up -d --scale api-gateway=3"