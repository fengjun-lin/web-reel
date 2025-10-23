// IndexedDB configuration constants

// Database table names
export const DB_TABLE_NAME = {
  RENDER_EVENT: 'renderEvent', // DOM render data
  RESPONSE_DATA: 'responseData', // API response data
} as const;

// Database name
export const DB_NAME = 'replay';

// Database index key
export const DB_INDEX_KEY = 'traceTime';

// Data retention duration (2 days in milliseconds)
export const RESERVE_DURATION = 1000 * 60 * 60 * 24 * 2;
