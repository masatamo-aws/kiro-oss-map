/**
 * Kiro OSS Map API Gateway v2.0.0
 * Main entry point for the API Gateway server
 */

import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { databaseService } from './services/database';
import { redisService } from './services/redis';

// Server instance
let server: any;

async function startServer(): Promise<void> {
  try {
    // Initialize services
    logger.info('🔧 Initializing services...');
    await databaseService.initialize();
    await redisService.initialize();
    logger.info('✅ Services initialized successfully');

    const port = config.server.port;
    
    server = app.listen(port, () => {
      logger.info(`🚀 Kiro OSS Map API Gateway v2.0.0 started`);
      logger.info(`📡 Server running on port ${port}`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`📚 API Documentation: http://localhost:${port}/api/v2`);
      logger.info(`❤️  Health Check: http://localhost:${port}/health`);
      logger.info(`🔍 Detailed Health: http://localhost:${port}/health/detailed`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('🛑 Shutting down API Gateway...');
  
  try {
    // Close services
    await databaseService.close();
    await redisService.close();
    logger.info('✅ Services closed');
  } catch (error) {
    logger.error('Error closing services:', error);
  }
  
  if (server) {
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start API Gateway:', error);
    process.exit(1);
  });
}

export { app, startServer, shutdown };