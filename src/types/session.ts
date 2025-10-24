/**
 * Session type definitions for database and API
 */

/**
 * Database Session entity
 * Represents a stored replay session in the database
 */
export interface Session {
  id: number;
  blob_url: string; // Vercel Blob public URL
  file_size: number; // File size in bytes
  jira_id: string | null;
  platform: string | null;
  device_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Session metadata without the file data
 * Used for listing sessions efficiently
 */
export interface SessionMetadata {
  id: number;
  jira_id: string | null;
  platform: string | null;
  device_id: string | null;
  created_at: Date;
  updated_at: Date;
  file_size: number; // Size of the file in bytes
}

/**
 * Request payload for creating a new session
 */
export interface CreateSessionRequest {
  file: Buffer; // Zip file as Buffer
  jira_id?: string;
  platform?: string;
  device_id?: string;
}

/**
 * Request payload for updating an existing session
 */
export interface UpdateSessionRequest {
  file?: Buffer; // Optional: replace the file (will trigger blob re-upload)
  jira_id?: string;
  platform?: string;
  device_id?: string;
}

/**
 * Response for session creation
 */
export interface CreateSessionResponse {
  success: boolean;
  session?: {
    id: number;
    file_size: number;
    created_at: string;
    jira_id: string | null;
    platform: string | null;
    device_id: string | null;
  };
  error?: string;
}

/**
 * Response for session retrieval
 */
export interface GetSessionResponse {
  success: boolean;
  session?: {
    id: number;
    blob_url: string; // Vercel Blob public URL to download the zip file
    file_size: number;
    jira_id: string | null;
    platform: string | null;
    device_id: string | null;
    created_at: string;
    updated_at: string;
  };
  error?: string;
}

/**
 * Response for session list
 */
export interface ListSessionsResponse {
  success: boolean;
  sessions?: SessionMetadata[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
}

/**
 * Response for session update
 */
export interface UpdateSessionResponse {
  success: boolean;
  session?: {
    id: number;
    updated_at: string;
    jira_id: string | null;
    platform: string | null;
    device_id: string | null;
  };
  error?: string;
}

/**
 * Response for session deletion
 */
export interface DeleteSessionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Query parameters for listing sessions
 */
export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  jira_id?: string;
  platform?: string;
  device_id?: string;
}
