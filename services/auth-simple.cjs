/**
 * Kiro OSS Map v2.1.0 - 簡易認証サービス
 * テスト用の基本的な認証サービス実装
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// インメモリユーザーストレージ（テスト用）
const users = new Map();
const sessions = new Map();

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// JWT風のトークン生成（簡易版）
function generateToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24時間
    iat: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// パスワードハッシュ化（簡易版）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime(),
    services: {
      database: {
        status: 'up',
        details: 'In-memory storage active'
      },
      redis: {
        status: 'up',
        details: 'In-memory session storage active'
      }
    }
  });
});

// ユーザー登録
app.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Email, password, and name are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (users.has(email)) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User already exists',
        timestamp: new Date().toISOString()
      }
    });
  }

  const userId = crypto.randomUUID();
  const user = {
    id: userId,
    email,
    name,
    password: hashPassword(password),
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };

  users.set(email, user);

  const token = generateToken(userId);
  const refreshToken = generateToken(userId + '_refresh');

  sessions.set(token, {
    userId,
    email,
    createdAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: userId,
        email,
        name,
        role: 'user'
      },
      tokens: {
        accessToken: token,
        refreshToken: refreshToken,
        expiresIn: 86400
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 詳細ヘルスチェック
app.get('/health/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      uptime: process.uptime(),
      services: {
        database: {
          status: 'down',
          details: 'Mock mode - PostgreSQL not connected'
        },
        redis: {
          status: 'down',
          details: 'Mock mode - Redis not connected'
        }
      },
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        cpu: {
          usage: process.cpuUsage().user / 1000000 // Convert to seconds
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Kubernetes Liveness Probe
app.get('/health/live', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString()
    }
  });
});

// Kubernetes Readiness Probe
app.get('/health/ready', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ready',
      timestamp: new Date().toISOString()
    }
  });
});

// Kubernetes Startup Probe
app.get('/health/startup', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'started',
      timestamp: new Date().toISOString()
    }
  });
});

// Prometheusメトリクス
app.get('/metrics', (req, res) => {
  const metrics = `# HELP auth_service_info Service information
# TYPE auth_service_info gauge
auth_service_info{version="2.1.0",service="auth-service"} 1

# HELP auth_service_uptime_seconds Service uptime in seconds
# TYPE auth_service_uptime_seconds counter
auth_service_uptime_seconds ${process.uptime()}

# HELP auth_service_memory_usage_bytes Memory usage in bytes
# TYPE auth_service_memory_usage_bytes gauge
auth_service_memory_usage_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}
auth_service_memory_usage_bytes{type="heap_total"} ${process.memoryUsage().heapTotal}
auth_service_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}

# HELP auth_service_requests_total Total number of requests
# TYPE auth_service_requests_total counter
auth_service_requests_total 0
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔐 Auth Service (Simple) started on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Register: POST http://localhost:${PORT}/auth/register`);
  console.log(`   Login: POST http://localhost:${PORT}/auth/login`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('Auth Service shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Auth Service shutting down...');
  process.exit(0);
});

// Liveness Probe
app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness Probe
app.get('/health/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// メトリクス
app.get('/metrics', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();
  
  const metrics = `# HELP auth_service_info Service information
# TYPE auth_service_info gauge
auth_service_info{version="2.1.0",service="auth-service"} 1

# HELP auth_service_uptime_seconds Service uptime in seconds
# TYPE auth_service_uptime_seconds counter
auth_service_uptime_seconds ${uptime}

# HELP auth_service_users_total Total number of users
# TYPE auth_service_users_total gauge
auth_service_users_total ${users.size}

# HELP auth_service_sessions_total Total number of active sessions
# TYPE auth_service_sessions_total gauge
auth_service_sessions_total ${sessions.size}

# HELP auth_service_memory_usage_bytes Memory usage in bytes
# TYPE auth_service_memory_usage_bytes gauge
auth_service_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}
auth_service_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}
auth_service_memory_usage_bytes{type="rss"} ${memUsage.rss}
`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
});