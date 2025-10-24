/**
 * Session Service Layer
 * Handles all database operations for replay sessions
 */

import { put, del } from '@vercel/blob';

import { db } from '@/lib/db';
import type {
  Session,
  SessionMetadata,
  CreateSessionRequest,
  UpdateSessionRequest,
  ListSessionsParams,
} from '@/types/session';

/**
 * Maximum file size: 20MB
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

/**
 * Create a new session in the database
 * @param data Session data including file and metadata
 * @returns Created session
 * @throws Error if file size exceeds limit or database operation fails
 */
export async function createSession(data: CreateSessionRequest): Promise<Session> {
  // Validate file size
  if (data.file.length > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of 20MB (got ${(data.file.length / 1024 / 1024).toFixed(2)}MB)`,
    );
  }

  // Upload file to Vercel Blob
  const timestamp = Date.now();
  const blob = await put(`sessions/session-${timestamp}.zip`, data.file, {
    access: 'public',
    addRandomSuffix: true,
  });

  // Store metadata in database
  const query = `
    INSERT INTO sessions (blob_url, file_size, jira_id, platform, device_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, blob_url, file_size, jira_id, platform, device_id, created_at, updated_at
  `;

  const session = await db.one<Session>(query, [
    blob.url,
    data.file.length,
    data.jira_id || null,
    data.platform || null,
    data.device_id || null,
  ]);

  return session;
}

/**
 * Get a session by ID
 * @param id Session ID
 * @returns Session with blob URL and metadata
 * @throws Error if session not found
 */
export async function getSessionById(id: number): Promise<Session> {
  const query = `
    SELECT id, blob_url, file_size, jira_id, platform, device_id, created_at, updated_at
    FROM sessions
    WHERE id = $1
  `;

  const session = await db.oneOrNone<Session>(query, [id]);

  if (!session) {
    throw new Error(`Session with ID ${id} not found`);
  }

  return session;
}

/**
 * List sessions with optional filtering and pagination
 * @param params Query parameters for filtering and pagination
 * @returns Array of session metadata (without file data)
 */
export async function listSessions(params: ListSessionsParams = {}): Promise<{
  sessions: SessionMetadata[];
  total: number;
}> {
  const { limit = 50, offset = 0, jira_id, platform, device_id } = params;

  // Build WHERE clauses dynamically
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (jira_id) {
    conditions.push(`jira_id = $${paramIndex++}`);
    values.push(jira_id);
  }

  if (platform) {
    conditions.push(`platform = $${paramIndex++}`);
    values.push(platform);
  }

  if (device_id) {
    conditions.push(`device_id = $${paramIndex++}`);
    values.push(device_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM sessions ${whereClause}`;
  const countResult = await db.one<{ count: string }>(countQuery, values);
  const total = parseInt(countResult.count, 10);

  // Get sessions with metadata (file_size is already stored in DB)
  const query = `
    SELECT 
      id, 
      jira_id, 
      platform, 
      device_id, 
      created_at, 
      updated_at,
      file_size
    FROM sessions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex}
  `;

  const sessions = await db.manyOrNone<SessionMetadata>(query, [...values, limit, offset]);

  return {
    sessions: sessions || [],
    total,
  };
}

/**
 * Update a session
 * @param id Session ID
 * @param updates Fields to update
 * @returns Updated session
 * @throws Error if session not found or file size exceeds limit
 */
export async function updateSession(id: number, updates: UpdateSessionRequest): Promise<Session> {
  // Build SET clauses dynamically
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // If file is being updated, handle blob replacement
  if (updates.file !== undefined) {
    // Validate file size
    if (updates.file.length > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of 20MB (got ${(updates.file.length / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    // Get old blob URL for deletion
    const oldSession = await getSessionById(id);

    // Upload new file to Vercel Blob
    const timestamp = Date.now();
    const blob = await put(`sessions/session-${timestamp}.zip`, updates.file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Delete old blob using the old blob URL
    try {
      await del(oldSession.blob_url);
    } catch (error) {
      console.warn('[Session Service] Failed to delete old blob:', error);
      // Continue anyway - new blob is uploaded
    }

    // Update blob-related fields
    setClauses.push(`blob_url = $${paramIndex++}`);
    values.push(blob.url);
    setClauses.push(`file_size = $${paramIndex++}`);
    values.push(updates.file.length);
  }

  if (updates.jira_id !== undefined) {
    setClauses.push(`jira_id = $${paramIndex++}`);
    values.push(updates.jira_id || null);
  }

  if (updates.platform !== undefined) {
    setClauses.push(`platform = $${paramIndex++}`);
    values.push(updates.platform || null);
  }

  if (updates.device_id !== undefined) {
    setClauses.push(`device_id = $${paramIndex++}`);
    values.push(updates.device_id || null);
  }

  if (setClauses.length === 0) {
    throw new Error('No fields to update');
  }

  // updated_at will be automatically updated by the trigger
  const query = `
    UPDATE sessions
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, blob_url, file_size, jira_id, platform, device_id, created_at, updated_at
  `;

  values.push(id);

  const session = await db.oneOrNone<Session>(query, values);

  if (!session) {
    throw new Error(`Session with ID ${id} not found`);
  }

  return session;
}

/**
 * Delete a session
 * @param id Session ID
 * @returns True if deleted successfully
 * @throws Error if session not found
 */
export async function deleteSession(id: number): Promise<boolean> {
  // Get session to retrieve blob URL
  const session = await getSessionById(id);

  // Delete from database first
  const query = `
    DELETE FROM sessions
    WHERE id = $1
    RETURNING id
  `;

  const result = await db.oneOrNone<{ id: number }>(query, [id]);

  if (!result) {
    throw new Error(`Session with ID ${id} not found`);
  }

  // Delete blob from Vercel Blob storage using the blob URL
  try {
    await del(session.blob_url);
  } catch (error) {
    console.warn('[Session Service] Failed to delete blob from Vercel:', error);
    // Don't throw - database record is already deleted
  }

  return true;
}

/**
 * Check if a session exists
 * @param id Session ID
 * @returns True if session exists
 */
export async function sessionExists(id: number): Promise<boolean> {
  const query = `SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1) as exists`;
  const result = await db.one<{ exists: boolean }>(query, [id]);
  return result.exists;
}
