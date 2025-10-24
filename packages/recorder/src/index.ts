/**
 * @web-reel/recorder
 * Lightweight session recording SDK based on rrweb
 */

// Main recorder class
export { WebReelRecorder } from './core';
export type { RecorderConfig } from './core';

// Export and import utilities
export { exportToFile, exportToZip, exportToJson } from './export';
export type { RecordCollection } from './export';
export { importFromFile, importFromZip, importFromJson } from './import';

// Network interceptor
export { NetworkInterceptor } from './interceptors';
export type { InterceptorConfig as NetworkInterceptorConfig } from './interceptors';
export type { HarEntry } from './types/har';

// Entry button UI (optional)
export { EntryButton } from './ui';

// Types
export type { RecorderOption, SessionLogPayload, UserInfo, EnvStat } from './types';

export { ErrNoType, UploadFlag } from './types';

// Constants
export { DB_TABLE_NAME, DB_INDEX_KEY, DB_NAME } from './constants/db';
export { UNKNOWN_DEVICE_ID, LOCAL_UPLOADING_FLAG, UPLOADING_SESSION_ID } from './constants/session';

// Utilities (advanced usage)
export { IDB } from './utils/db';
export { compatibilityJudge } from './utils/browser';
export { initDB, cleanOldData, getRenderEventSize, getResponseDataSize } from './utils/dbHelper';
export { getUploadingSessionId, setUploadingSessionId, clearUploadingSessionId } from './utils/session';

// API services (if backend integration is needed)
export { uploadPvStat, uploadEnvStat, getUploadLogFlag, setUploadLogFlag, uploadSessionLog } from './services/api';
export { getApiPrefix, httpGet, httpPost } from './services/http';
