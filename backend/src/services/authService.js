import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'messpulse_token';

/**
 * Generate a signed JWT token
 */
export const generateToken = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    reg_no: user.reg_no,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Register a new student user
 * Strict rule: Public registration ALWAYS creates role = 'student'
 */
export const registerUser = async ({ fullName, email, regNo, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRegNo = regNo.trim().toUpperCase();

  // Check if email or reg_no already exists
  const existingCheck = await query(
    'SELECT id, email, reg_no FROM users WHERE email = $1 OR reg_no = $2',
    [normalizedEmail, normalizedRegNo]
  );

  if (existingCheck.rowCount > 0) {
    const existing = existingCheck.rows[0];
    if (existing.email.toLowerCase() === normalizedEmail) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
    if (existing.reg_no.toUpperCase() === normalizedRegNo) {
      const error = new Error('An account with this registration number already exists.');
      error.statusCode = 409;
      error.code = 'REG_NO_EXISTS';
      throw error;
    }
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const insertSql = `
    INSERT INTO users (full_name, email, reg_no, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, 'student', TRUE)
    RETURNING id, full_name, email, reg_no, role, is_active, created_at;
  `;

  const result = await query(insertSql, [
    fullName.trim(),
    normalizedEmail,
    normalizedRegNo,
    passwordHash,
  ]);

  const newUser = result.rows[0];
  const token = generateToken(newUser);

  return {
    user: {
      id: newUser.id,
      fullName: newUser.full_name,
      email: newUser.email,
      regNo: newUser.reg_no,
      role: newUser.role,
    },
    token,
  };
};

/**
 * Authenticate user with Email OR Registration Number
 */
export const authenticateUser = async ({ identifier, password }) => {
  const cleanIdentifier = identifier.trim();

  // Query user by email OR reg_no (case-insensitive via CITEXT)
  const userSql = `
    SELECT id, full_name, email, reg_no, password_hash, role, is_active
    FROM users
    WHERE email = $1 OR reg_no = $1;
  `;

  const result = await query(userSql, [cleanIdentifier]);

  if (result.rowCount === 0) {
    const error = new Error('Invalid email/registration number or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const user = result.rows[0];

  if (!user.is_active) {
    const error = new Error('Your account has been deactivated. Please contact the mess administration.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_DEACTIVATED';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email/registration number or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      regNo: user.reg_no,
      role: user.role,
    },
    token,
  };
};

/**
 * Get user profile by ID
 */
export const getUserById = async (userId) => {
  const result = await query(
    `SELECT id, full_name, email, reg_no, role, is_active, created_at
     FROM users
     WHERE id = $1;`,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    regNo: row.reg_no,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
};
