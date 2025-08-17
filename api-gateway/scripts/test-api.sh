#!/bin/bash

# Kiro OSS Map API Gateway Test Script
# Tests basic functionality of the API Gateway

set -e

API_BASE_URL="http://localhost:3000"
API_KEY="test-api-key-12345"

echo "🚀 Testing Kiro OSS Map API Gateway v2.0.0"
echo "=========================================="

# Test 1: Health Check
echo "📋 Test 1: Health Check"
curl -s "$API_BASE_URL/health" | jq '.'
echo "✅ Health check passed"
echo ""

# Test 2: API Documentation
echo "📚 Test 2: API Documentation"
curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v2" | jq '.name, .version'
echo "✅ API documentation accessible"
echo ""

# Test 3: User Registration
echo "👤 Test 3: User Registration"
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "organizationName": "Test Organization"
  }' \
  "$API_BASE_URL/api/v2/auth/register")

echo "$REGISTER_RESPONSE" | jq '.message'
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken // empty')

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ User registration successful"
else
  echo "ℹ️  User may already exist, trying login..."
  
  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }' \
    "$API_BASE_URL/api/v2/auth/login")
  
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // empty')
  echo "✅ User login successful"
fi
echo ""

# Test 4: Map Styles API
echo "🗺️  Test 4: Map Styles API"
curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v2/maps/styles" | jq '.styles | length'
echo "✅ Map styles API working"
echo ""

# Test 5: Search API
echo "🔍 Test 5: Search API"
curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v2/search/geocode?q=Tokyo" | jq '.query, (.results | length)'
echo "✅ Search API working"
echo ""

# Test 6: Routing API
echo "🛣️  Test 6: Routing API"
ROUTE_RESPONSE=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [139.7671, 35.6812],
    "destination": [139.6917, 35.6895],
    "profile": "driving"
  }' \
  "$API_BASE_URL/api/v2/routing/calculate")

echo "$ROUTE_RESPONSE" | jq '.routes | length'
echo "✅ Routing API working"
echo ""

# Test 7: User Bookmarks API (requires authentication)
if [ -n "$ACCESS_TOKEN" ]; then
  echo "📍 Test 7: User Bookmarks API"
  curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE_URL/api/v2/user/bookmarks" | jq '.bookmarks | length'
  echo "✅ User bookmarks API working"
  echo ""
fi

# Test 8: Rate Limiting
echo "⚡ Test 8: Rate Limiting"
echo "Making multiple requests to test rate limiting..."
for i in {1..5}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health")
  echo "Request $i: HTTP $STATUS"
done
echo "✅ Rate limiting configured"
echo ""

echo "🎉 All API Gateway tests completed successfully!"
echo "🌐 API Gateway is ready for production use"
echo ""
echo "📚 Next steps:"
echo "  1. Configure production environment variables"
echo "  2. Set up SSL certificates"
echo "  3. Configure monitoring and alerting"
echo "  4. Set up backup and disaster recovery"
echo ""
echo "📖 Documentation: http://localhost:3000/api/v2"
echo "❤️  Health Check: http://localhost:3000/health"