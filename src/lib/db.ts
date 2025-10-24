import pgPromise from 'pg-promise';

/**
 * Database connection singleton for Neon Postgres
 * Uses pg-promise library for connection management and queries
 */

// Initialize pg-promise
const pgp = pgPromise({
  // Optional: Add custom error handling or query logging here
  error(error, e) {
    if (e.cn) {
      // A connection-related error;
      console.error('[DB] Connection error:', error);
    }
  },
});

// Create database instance using DATABASE_URL from environment
const getDatabaseUrl = (): string => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return dbUrl;
};

// Singleton database instance
let dbInstance: pgPromise.IDatabase<unknown> | null = null;

export const getDb = (): pgPromise.IDatabase<unknown> => {
  if (!dbInstance) {
    dbInstance = pgp(getDatabaseUrl());
  }
  return dbInstance;
};

// Export pgp for helpers access (e.g., pgp.helpers)
export { pgp };

// Export db as a convenience (will throw if DATABASE_URL not set)
export const db = getDb();
