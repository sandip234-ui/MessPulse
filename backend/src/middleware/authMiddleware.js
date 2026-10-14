import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';
import { getUserById, AUTH_COOKIE_NAME } from '../services/authService.js';

/**
 * Authentication Middleware
 * Validates JWT from HTTP-only cookie or Authorization header
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Read from HTTP-only cookie
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // 2. Fallback to Bearer token header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please sign in.', 'AUTH_REQUIRED', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please sign in again.', 'TOKEN_EXPIRED', 401);
      }
      return sendError(res, 'Invalid authentication token.', 'TOKEN_INVALID', 401);
    }

    const user = await getUserById(decoded.sub);
    if (!user) {
      return sendError(res, 'User associated with this session no longer exists.', 'USER_NOT_FOUND', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated.', 'ACCOUNT_DEACTIVATED', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware for Admins
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }

  if (req.user.role !== 'admin') {
    return sendError(
      res,
      'Access denied. Administrator privileges required.',
      'FORBIDDEN_ADMIN_ONLY',
      403
    );
  }

  next();
};
