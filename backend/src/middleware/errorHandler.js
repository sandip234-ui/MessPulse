import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // Always log full error details server-side for operational troubleshooting
  console.error(`🚨 Error handling request [${req.method} ${req.originalUrl || req.url}]:`, {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode || err.status,
    stack: err.stack,
  });

  // PostgreSQL duplicate key error (code 23505)
  if (err.code === '23505') {
    let message = 'A record with this unique value already exists.';
    if (err.detail?.includes('email')) {
      message = 'An account with this email address is already registered.';
    } else if (err.detail?.includes('reg_no')) {
      message = 'An account with this registration number is already registered.';
    } else if (err.constraint?.includes('uq_user_daily_meal_rating')) {
      message = 'You have already submitted a rating for this meal slot today.';
    } else if (err.constraint?.includes('uq_user_daily_dish_vote')) {
      message = 'You have already cast a vote for this dish today.';
    }
    return sendError(
      res,
      message,
      'DUPLICATE_ENTRY',
      409,
      env.NODE_ENV === 'development' ? err.detail : null
    );
  }

  // PostgreSQL check constraint violation (code 23514)
  if (err.code === '23514') {
    return sendError(
      res,
      'Database validation constraint failed.',
      'CONSTRAINT_VIOLATION',
      400,
      env.NODE_ENV === 'development' ? err.constraint : null
    );
  }

  // PostgreSQL foreign key violation (code 23503)
  if (err.code === '23503') {
    return sendError(
      res,
      'Referenced resource does not exist.',
      'FOREIGN_KEY_VIOLATION',
      400,
      env.NODE_ENV === 'development' ? err.detail : null
    );
  }

  const statusCode = err.statusCode || err.status || 500;
  const isInternal500 = statusCode >= 500;

  // In production, never expose raw server error messages or stack traces for internal 500s
  const message = isInternal500 && env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  const code = err.code && typeof err.code === 'string' && err.code.length < 30
    ? err.code
    : (isInternal500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');

  return sendError(
    res,
    message,
    code,
    statusCode,
    env.NODE_ENV === 'development' && isInternal500 ? { stack: err.stack } : (err.details || null)
  );
};

export const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404);
};
