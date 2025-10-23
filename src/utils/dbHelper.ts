import { IDB } from './db';

import { DB_INDEX_KEY, DB_NAME, DB_TABLE_NAME, RESERVE_DURATION } from '@/constants/db';

/**
 * Initialize IndexedDB with standard schema
 */
export async function initDB(projectName: string): Promise<IDB> {
  const db = new IDB(`${DB_NAME}-${projectName}`, 1, [
    { name: DB_TABLE_NAME.RENDER_EVENT, indexKeys: [DB_INDEX_KEY] },
    { name: DB_TABLE_NAME.RESPONSE_DATA, indexKeys: [DB_INDEX_KEY] },
  ]);

  await db.open();
  console.log('[Web-Reel] IndexedDB initialized');
  return db;
}

/**
 * Clean old data from IndexedDB
 * Only keep data within the retention period
 */
export async function cleanOldData(db: IDB, traceTime: number, recordInterval?: number): Promise<void> {
  // Calculate retention time
  const reserveTime =
    recordInterval === -1
      ? 0 // Keep all data
      : recordInterval === 0
        ? traceTime - 1000 * 10 // Keep only last 10 seconds (don't delete too aggressively)
        : traceTime - ((recordInterval ?? 0) * 1000 * 60 * 60 * 24 || RESERVE_DURATION);

  const totalRenderEvent = await db.count(DB_TABLE_NAME.RENDER_EVENT);
  const totalResponseData = await db.count(DB_TABLE_NAME.RESPONSE_DATA);

  const renderEventCount = await db.deleteDataByIndex(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY, reserveTime);
  const responseDataCount = await db.deleteDataByIndex(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY, reserveTime);

  console.log(`[Web-Reel] Total count: ${totalRenderEvent} render events, ${totalResponseData} response data`);
  console.log(`[Web-Reel] Deleted count: ${renderEventCount} render events, ${responseDataCount} response data`);
}

/**
 * Get render event data size (approximate)
 */
export async function getRenderEventSize(db: IDB): Promise<number> {
  try {
    const data = await db.getByIndexKey(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY);
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  } catch (error) {
    console.error('[Web-Reel] Failed to get render event size:', error);
    return 0;
  }
}

/**
 * Get response data size (approximate)
 */
export async function getResponseDataSize(db: IDB): Promise<number> {
  try {
    const data = await db.getByIndexKey(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY);
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  } catch (error) {
    console.error('[Web-Reel] Failed to get response data size:', error);
    return 0;
  }
}

/**
 * Get all session IDs from database
 */
export async function getAllSessionIds(db: IDB): Promise<number[]> {
  const sessionIds = await db.getAllIndexKeys(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY);
  return sessionIds.sort((a, b) => b - a); // Sort descending (newest first)
}

/**
 * Delete session data by session ID
 */
export async function deleteSession(db: IDB, sessionId: number): Promise<void> {
  await db.deleteDataByIndexValue(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY, sessionId);
  await db.deleteDataByIndexValue(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY, sessionId);
  console.log(`[Web-Reel] Deleted session: ${sessionId}`);
}
