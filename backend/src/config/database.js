import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Detect if SSL is required by URL or non-localhost production environment
const isSslRequired =
  env.DATABASE_URL.includes('sslmode=require') ||
  env.DATABASE_URL.includes('ssl=true') ||
  (env.NODE_ENV === 'production' && !env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1'));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Execute parameterized SQL query
 * @param {string} text - SQL statement with placeholders ($1, $2, ...)
 * @param {Array} params - Array of parameter values
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for multi-statement transactions
 */
export const getClient = () => pool.connect();

/**
 * Check database connectivity
 */
export const checkDbConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as db');
    return { ok: true, now: res.rows[0].now, db: res.rows[0].db };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Cleanly close pool during application termination
 */
export const closePool = async () => {
  try {
    await pool.end();
    console.log('📦 PostgreSQL connection pool closed cleanly.');
  } catch (err) {
    console.error('Error closing PostgreSQL pool:', err);
  }
};
