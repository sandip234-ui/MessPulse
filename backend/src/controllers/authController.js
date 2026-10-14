import { registerUser, authenticateUser, AUTH_COOKIE_NAME } from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

// Cookie configuration aligned with 24h JWT expiration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : env.NODE_ENV === 'production',
  sameSite: env.COOKIE_SAME_SITE || (env.NODE_ENV === 'production' ? 'lax' : 'lax'),
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
});

export const register = async (req, res, next) => {
  try {
    const { fullName, email, regNo, password } = req.body;
    const { user, token } = await registerUser({ fullName, email, regNo, password });

    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());

    return sendSuccess(
      res,
      { user, token },
      'Registration successful. Welcome to MessPulse!',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const { user, token } = await authenticateUser({ identifier, password });

    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());

    return sendSuccess(
      res,
      { user, token },
      'Sign in successful.'
    );
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAME_SITE || (env.NODE_ENV === 'production' ? 'lax' : 'lax'),
  });

  return sendSuccess(res, null, 'Signed out successfully.');
};

export const getMe = (req, res) => {
  return sendSuccess(res, { user: req.user });
};
