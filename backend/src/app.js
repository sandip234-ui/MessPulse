import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { checkDbConnection } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS configuration (Strict for credentials & cookies)
const allowedOrigins = env.FRONTEND_URL.includes(',')
  ? env.FRONTEND_URL.split(',').map((origin) => origin.trim())
  : [env.FRONTEND_URL.trim()];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocks access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body & Cookie Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 4. Request Logging (skip during automated testing)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 5. Safe Health Check Endpoint
const healthHandler = async (req, res) => {
  const dbHealth = await checkDbConnection();
  const isHealthy = dbHealth.ok;

  const healthData = {
    status: isHealthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: isHealthy ? 'connected' : 'disconnected',
    environment: env.NODE_ENV,
    timezone: 'Asia/Kolkata',
  };

  if (!isHealthy) {
    return res.status(503).json({
      success: false,
      data: healthData,
      message: 'Service is experiencing database connectivity issues.',
    });
  }

  return sendSuccess(res, healthData, 'MessPulse API is healthy and operational.');
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// 6. API v1 Master Router
app.use('/api/v1', routes);

// 7. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
