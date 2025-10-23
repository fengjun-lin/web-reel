import { ACTIVE_SESSION_IDS, UPLOADING_SESSION_ID } from '@/constants/session';

// Cache for active session IDs
let activeSessionIdsCache: number[] | null = null;

/**
 * Get all active session IDs from localStorage
 */
export function getActiveSessionIds(): number[] {
  if (activeSessionIdsCache) {
    return activeSessionIdsCache;
  }

  const json = localStorage.getItem(ACTIVE_SESSION_IDS) || '[]';
  try {
    activeSessionIdsCache = JSON.parse(json) || [];
  } catch (error) {
    console.warn('[Session] Failed to parse active session IDs:', error);
    activeSessionIdsCache = [];
  }

  return activeSessionIdsCache || [];
}

/**
 * Set active session IDs to localStorage
 */
export function setActiveSessionIds(sessionIds: number[]): void {
  try {
    const json = JSON.stringify(sessionIds);
    localStorage.setItem(ACTIVE_SESSION_IDS, json);
    activeSessionIdsCache = sessionIds;
  } catch (error) {
    console.error('[Session] Failed to save active session IDs:', error);
    localStorage.setItem(ACTIVE_SESSION_IDS, '[]');
    activeSessionIdsCache = [];
  }
}

/**
 * Add a session ID to active sessions
 */
export function addActiveSessionId(sessionId: number): void {
  const sessionIds = getActiveSessionIds();

  if (!sessionIds.includes(sessionId)) {
    sessionIds.push(sessionId);
  }

  setActiveSessionIds(sessionIds);
}

/**
 * Remove a session ID from active sessions
 */
export function removeActiveSessionId(sessionId: number): void {
  const sessionIds = getActiveSessionIds();
  const filtered = sessionIds.filter((id) => id !== sessionId);
  setActiveSessionIds(filtered);
}

/**
 * Check if a session ID is active
 */
export function isActiveSessionId(sessionId: number): boolean {
  const sessionIds = getActiveSessionIds();
  return sessionIds.includes(sessionId);
}

/**
 * Set currently uploading session ID
 */
export function setUploadingSessionId(sessionId: number): void {
  localStorage.setItem(UPLOADING_SESSION_ID, String(sessionId));
}

/**
 * Clear uploading session ID
 */
export function clearUploadingSessionId(): void {
  localStorage.removeItem(UPLOADING_SESSION_ID);
}

/**
 * Get currently uploading session ID
 */
export function getUploadingSessionId(): number | null {
  const json = localStorage.getItem(UPLOADING_SESSION_ID);
  return json ? Number(json) : null;
}
