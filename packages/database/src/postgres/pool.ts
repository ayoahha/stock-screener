/**
 * PostgreSQL Connection Pool
 *
 * Manages the connection pool for direct PostgreSQL connections.
 * Used when DATABASE_URL is set (Docker/local PostgreSQL).
 */

import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection configuration from environment
 */
function getPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use connection string
    return {
      connectionString: databaseUrl,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Timeout after 10s when connecting
    };
  }

  // Use individual environment variables
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'stockscreener',
    user: process.env.POSTGRES_USER || 'stockscreener',
    password: process.env.POSTGRES_PASSWORD || 'stockscreener',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

/**
 * Get or create the connection pool (singleton)
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    console.log('[PostgreSQL] Creating connection pool...');
    console.log('[PostgreSQL] Host:', config.host || '(from connection string)');
    console.log('[PostgreSQL] Database:', config.database || '(from connection string)');
    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('[PostgreSQL] Pool error:', err);
    });

    pool.on('connect', () => {
      console.log('[PostgreSQL] New client connected');
    });
  }
  return pool;
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('[PostgreSQL] Closing connection pool...');
    await pool.end();
    pool = null;
    console.log('[PostgreSQL] Connection pool closed');
  }
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const result = await p.query('SELECT NOW() as now');
    console.log('[PostgreSQL] Connection test successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[PostgreSQL] Connection test failed:', error);
    return false;
  }
}
