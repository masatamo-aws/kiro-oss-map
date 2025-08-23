# Kiro OSS Map API Gateway

A comprehensive RESTful API Gateway for the Kiro Open Source Map platform, providing secure access to mapping, geocoding, routing, and user management services.

## 🚀 Features

- **Authentication & Authorization**: JWT-based user authentication with role-based access control
- **API Key Management**: Secure API key authentication for external integrations
- **Maps API**: Access to map tiles, styles, and geographic data
- **Search & Geocoding**: Forward and reverse geocoding with autocomplete
- **Routing**: Multi-modal route calculation and optimization
- **User Management**: User profiles, bookmarks, and preferences
- **Rate Limiting**: Configurable rate limiting per API key and user
- **Comprehensive Logging**: Structured logging with Winston
- **Health Monitoring**: Health check endpoints for system monitoring
- **Docker Support**: Full containerization with Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kiro-oss/map.git
   cd map/api-gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb kiro_map
   
   # Run initialization script
   psql -d kiro_map -f init.sql
   ```

5. **Start Redis**
   ```bash
   redis-server
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Check service status**
   ```bash
   docker-compose ps
   ```

3. **View logs**
   ```bash
   docker-compose logs -f api-gateway
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `1h` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `RATE_LIMIT_MAX` | Max requests per window | `1000` |
| `LOG_LEVEL` | Logging level | `info` |

### API Key Setup

1. **Generate API Key**
   ```bash
   # Use the admin interface or direct database insert
   INSERT INTO api_keys (key_hash, name, organization_id, permissions) 
   VALUES ('hashed_key', 'My API Key', 'org_id', ARRAY['maps:read', 'search:read']);
   ```

2. **Use API Key**
   ```bash
   curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v2/maps/styles
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v2
```

### Authentication

#### Register User
```http
POST /api/v2/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "organizationName": "My Organization"
}
```

#### Login
```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Maps API

#### Get Map Styles
```http
GET /api/v2/maps/styles
X-API-Key: your-api-key
```

#### Get Map Tiles
```http
GET /api/v2/maps/tiles/{z}/{x}/{y}
X-API-Key: your-api-key
```

### Search API

#### Geocoding
```http
GET /api/v2/search/geocode?q=Tokyo Station
X-API-Key: your-api-key
```

#### Reverse Geocoding
```http
GET /api/v2/search/reverse?lat=35.6812&lng=139.7671
X-API-Key: your-api-key
```

### Routing API

#### Calculate Route
```http
POST /api/v2/routing/calculate
X-API-Key: your-api-key
Content-Type: application/json

{
  "origin": [139.7671, 35.6812],
  "destination": [139.6917, 35.6895],
  "profile": "driving"
}
```

### User API

#### Get Bookmarks
```http
GET /api/v2/user/bookmarks
Authorization: Bearer your-jwt-token
```

#### Create Bookmark
```http
POST /api/v2/user/bookmarks
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "My Favorite Place",
  "coordinates": [139.7671, 35.6812],
  "category": "restaurant"
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Test with API key
curl -H "X-API-Key: test-key" http://localhost:3000/api/v2/maps/styles
```

## 📊 Monitoring

### Health Checks
- **Basic**: `GET /health`
- **Detailed**: `GET /health/detailed`

### Metrics
- Request/response times
- Error rates
- API usage statistics
- Database connection status
- Redis connection status

### Logging
Structured JSON logs with the following levels:
- `error`: Error conditions
- `warn`: Warning conditions  
- `info`: Informational messages
- `debug`: Debug information

## 🔒 Security

### Features
- JWT-based authentication
- API key validation
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- SQL injection prevention
- XSS protection

### Best Practices
- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure monitoring
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Set resource limits
- [ ] Enable security headers

### Docker Production
```bash
# Build production image
docker build -t kiro-map-api:latest .

# Run with production config
docker run -d \
  --name kiro-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  kiro-map-api:latest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.kiro-map.com](https://docs.kiro-map.com)
- **Issues**: [GitHub Issues](https://github.com/kiro-oss/map/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kiro-oss/map/discussions)
- **Email**: support@kiro-map.com

## 🗺️ Roadmap

- [ ] GraphQL API support
- [ ] WebSocket real-time updates
- [ ] Advanced analytics
- [ ] Multi-tenant support
- [ ] Plugin system
- [ ] Mobile SDK integration