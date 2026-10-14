import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects sensitive endpoints against brute force and abuse without external infrastructure.
 * 
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (e.g. 15 * 60 * 1000 = 15 min)
 * @param {number} options.max - Max allowed requests per IP within windowMs
 * @param {string} options.message - Error message returned to client
 * @param {string} options.code - Error code returned to client
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests from this IP. Please try again later.',
  code = 'RATE_LIMIT_EXCEEDED',
} = {}) => {
  const ipRequests = new Map();

  // Periodic garbage collection every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipRequests.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        ipRequests.delete(ip);
      } else {
        ipRequests.set(ip, validTimestamps);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref prevents timer from keeping process alive

  return (req, res, next) => {
    // Bypass in test environment to avoid interfering with automated test suites
    if (env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const timestamps = ipRequests.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const oldest = validTimestamps[0];
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);

      return sendError(res, message, code, 429, { retryAfterSeconds });
    }

    validTimestamps.push(now);
    ipRequests.set(ip, validTimestamps);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - validTimestamps.length));

    next();
  };
};

// Specialized limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

export const feedbackRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 submissions per 15 min per IP
  message: 'Too many feedback submissions from this IP. Please wait a few minutes.',
  code: 'FEEDBACK_RATE_LIMIT_EXCEEDED',
});
