import app from './app.js';
import { env } from './config/env.js';
import { checkDbConnection, closePool } from './config/database.js';

async function startServer() {
  try {
    const dbCheck = await checkDbConnection();
    if (!dbCheck.ok) {
      console.error('❌ Fatal: PostgreSQL connection failed at server startup:', dbCheck.error);
      process.exit(1);
    }
    console.log(`✅ Connected to PostgreSQL database: [${dbCheck.db}]`);

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 MessPulse Backend running on http://localhost:${env.PORT}`);
      console.log(`📡 Environment: [${env.NODE_ENV}] | Timezone: [Asia/Kolkata]`);
      console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    });

    let isShuttingDown = false;

    // Graceful shutdown handler
    const gracefulShutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n🛑 Received ${signal}. Gracefully shutting down MessPulse server...`);

      // Force exit if graceful shutdown takes longer than 10 seconds
      const forceExitTimer = setTimeout(() => {
        console.error('⚠️ Forcefully terminating server due to shutdown timeout.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      server.close(async () => {
        console.log('💤 HTTP server closed to new connections.');
        await closePool();
        console.log('✅ Graceful shutdown completed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Fatal error starting MessPulse server:', error);
    process.exit(1);
  }
}

startServer();
