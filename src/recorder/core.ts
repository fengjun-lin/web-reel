import { record, getRecordConsolePlugin } from 'rrweb';
import type { eventWithTime } from 'rrweb/typings/types';

import { exportToFile, exportToZip } from './export';
import { NetworkInterceptor, URLInterceptor } from './interceptors';
import { EntryButton } from './ui';
import { uploadSession } from './upload';
import type { UploadOptions } from './upload';

import { DB_INDEX_KEY, DB_TABLE_NAME } from '@/constants/db';
import { LOCAL_UPLOADING_FLAG, UNKNOWN_DEVICE_ID } from '@/constants/session';
import { getUploadLogFlag, setUploadLogFlag, uploadEnvStat, uploadPvStat, uploadSessionLog } from '@/services/api';
import { getApiPrefix } from '@/services/http';
import type { EnvStat, RecorderOption, SessionLogPayload, UserInfo } from '@/types';
import { ErrNoType as ErrNo, UploadFlag as UFlag } from '@/types';
import type { HarEntry } from '@/types/har';
import { compatibilityJudge } from '@/utils/browser';
import { IDB } from '@/utils/db';
import { cleanOldData, getRenderEventSize, getResponseDataSize, initDB } from '@/utils/dbHelper';
import { clearUploadingSessionId, getUploadingSessionId, setUploadingSessionId } from '@/utils/session';

export interface RecorderConfig extends RecorderOption {
  // Inherited from RecorderOption
}

/**
 * Web Reel Recorder
 * Records user interactions, console logs, and network requests
 */
export class WebReelRecorder {
  private config: RecorderConfig;
  private db!: IDB;
  private sessionId: number; // Current session ID (timestamp)
  private networkInterceptor?: NetworkInterceptor;
  private urlInterceptor?: URLInterceptor;
  private stopRecordingFn?: () => void;
  private pollUploadFlagTimer?: number;
  private entryButton?: EntryButton;
  private isReady: boolean = false; // Whether the recorder is fully initialized
  private recordAddCustomEvent?: (_tag: string, _payload: any) => void;

  constructor(config: RecorderConfig) {
    this.config = this.parseConfig(config);
    this.sessionId = 0;

    // Validate required fields
    const requiredFields: Array<keyof RecorderConfig> = ['projectName', 'env', 'appId'];
    const unfilledFields = requiredFields.filter((field) => !config?.[field]);

    if (unfilledFields.length) {
      console.error(`[Web-Reel] Initialization failed! Missing required fields: ${unfilledFields.join(', ')}`);
      return;
    }

    // Set default device ID if not provided
    if (!this.config.deviceId) {
      this.config.deviceId = UNKNOWN_DEVICE_ID;
    }

    // Start setup
    this.setup();
  }

  /**
   * Parse and validate configuration
   */
  private parseConfig(config: RecorderConfig): RecorderConfig {
    return {
      ...config,
      recordInterval: config.recordInterval ?? 2, // Default 2 days
      disabledDownLoad: config.disabledDownLoad ?? false,
      enableStats: config.enableStats ?? false, // Default disabled
    };
  }

  /**
   * Main setup function
   */
  private async setup(): Promise<void> {
    // Check browser compatibility
    const isCompatible = compatibilityJudge();
    if (!isCompatible) {
      console.warn('[Web-Reel] Current environment does not support this SDK, initialization failed');
      return;
    }

    // Initialize database
    await this.initializeDB();

    // Initialize UI entry button
    this.initializeEntryButton();

    // Initialize network interceptor
    this.initializeNetworkInterceptor();

    // Initialize rrweb recording
    this.initializeRecording();

    // Initialize URL interceptor (after rrweb recording)
    this.initializeURLInterceptor();

    // Setup window unload handler
    this.setupUnloadHandler();

    // Upload statistics (delayed) - only if enabled
    if (this.config.enableStats) {
      setTimeout(async () => {
        await this.uploadPvStat();
        await this.uploadEnvStat();
      }, 1000);

      // Start polling upload flag - only when stats enabled
      this.pollUploadFlag(10000);
    }

    // Mark as ready
    this.isReady = true;
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDB(): Promise<void> {
    this.sessionId = Date.now();
    this.db = await initDB(this.config.projectName);

    // Clean old data
    setTimeout(() => {
      cleanOldData(this.db, this.sessionId, this.config.recordInterval);
    }, 1000);
  }

  /**
   * Initialize UI entry button
   */
  private initializeEntryButton(): void {
    if (this.config.disabledDownLoad) {
      return;
    }

    // Determine button mode based on configuration
    const isUploadMode = !!this.config.uploadEndpoint;

    this.entryButton = new EntryButton({
      mode: isUploadMode ? 'upload' : 'download',
      onClick: () => {
        if (isUploadMode) {
          this.uploadLog();
        } else {
          this.exportLog();
        }
      },
    });
  }

  /**
   * Initialize network interceptor
   */
  private initializeNetworkInterceptor(): void {
    this.networkInterceptor = new NetworkInterceptor({
      onRequestStart: (_url, _timestamp) => {
        // Optional: Add custom event to rrweb timeline
        // record.addCustomEvent('request-start', { url, timestamp })
      },
      onRequestComplete: (entry) => {
        // Save network request to database
        this.db.add(
          {
            [DB_INDEX_KEY]: this.sessionId,
            ...entry,
          },
          DB_TABLE_NAME.RESPONSE_DATA,
        );
      },
      shouldIgnore: (url) => this.shouldIgnoreUrl(url),
    });

    this.networkInterceptor.install();
  }

  /**
   * Initialize rrweb recording
   */
  private initializeRecording(): void {
    // Track event count for current session
    let eventCount = 0;
    const MAX_EVENTS = 5000;

    this.stopRecordingFn = record({
      emit: async (event: eventWithTime) => {
        // Save event to database
        await this.db.add(
          {
            [DB_INDEX_KEY]: this.sessionId,
            ...event,
          },
          DB_TABLE_NAME.RENDER_EVENT,
        );

        // Increment counter and check if we need to clean up old events
        eventCount++;
        if (eventCount > MAX_EVENTS) {
          // Delete oldest events to keep only MAX_EVENTS
          try {
            const allEvents = await this.db.getDataByIndexValue(
              DB_TABLE_NAME.RENDER_EVENT,
              DB_INDEX_KEY,
              this.sessionId,
            );

            if (allEvents && allEvents.length > MAX_EVENTS) {
              // Sort by timestamp and delete oldest ones
              const sortedEvents = allEvents.sort((a: any, b: any) => a.timestamp - b.timestamp);
              const eventsToDelete = sortedEvents.slice(0, allEvents.length - MAX_EVENTS);

              for (const evt of eventsToDelete) {
                await this.db.delete(evt.id, DB_TABLE_NAME.RENDER_EVENT);
              }

              eventCount = MAX_EVENTS;
            }
          } catch (error) {
            console.error('[Web-Reel] Failed to cleanup old events:', error);
          }
        }
      },
      // Enable console recording using the console plugin
      plugins: [
        getRecordConsolePlugin({
          level: ['log', 'info', 'warn', 'error', 'debug'],
          lengthThreshold: 10000, // Max length for string values
          logger: 'console', // Record from window.console
        }),
      ],
    });

    // Store the addCustomEvent function reference
    // rrweb's record function doesn't directly expose addCustomEvent,
    // so we'll use the event system to emit custom events
    this.recordAddCustomEvent = (tag: string, payload: any) => {
      // Create a custom event in rrweb format
      const customEvent = {
        type: 5, // Custom event type
        data: {
          tag,
          payload,
        },
        timestamp: Date.now(),
      };

      // Save to database
      this.db
        .add(
          {
            [DB_INDEX_KEY]: this.sessionId,
            ...customEvent,
          },
          DB_TABLE_NAME.RENDER_EVENT,
        )
        .catch(() => {
          // Silently ignore errors
        });
    };
  }

  /**
   * Initialize URL interceptor
   */
  private initializeURLInterceptor(): void {
    this.urlInterceptor = new URLInterceptor({
      onURLChange: (url, trigger) => {
        // Record URL change as custom event
        if (this.recordAddCustomEvent) {
          this.recordAddCustomEvent('url-change', {
            url,
            trigger,
            timestamp: Date.now(),
          });
        }
      },
    });

    this.urlInterceptor.install();
  }

  /**
   * Setup window unload handler
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this.sessionId === getUploadingSessionId()) {
        clearUploadingSessionId();
        localStorage.removeItem(LOCAL_UPLOADING_FLAG);
      }
    });
  }

  /**
   * Check if URL should be ignored
   */
  private shouldIgnoreUrl(url: string): boolean {
    const apiPrefix = getApiPrefix(this.config.env);
    return url.includes(apiPrefix);
  }

  /**
   * Export logs to file
   */
  public async exportLog(useZip: boolean = false, clearAfterExport: boolean = true): Promise<void> {
    console.log('[Web-Reel Export] Starting export...');

    const eventDataMap = await this.db.getByIndexKey(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY);
    const responseDataMap = await this.db.getByIndexKey(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY);

    // Only export current session to avoid data too large
    const currentSessionId = String(this.sessionId);
    const limitedEventDataMap =
      currentSessionId in eventDataMap ? { [currentSessionId]: eventDataMap[currentSessionId] } : {};
    const limitedResponseDataMap =
      currentSessionId in responseDataMap ? { [currentSessionId]: responseDataMap[currentSessionId] } : {};

    // Count total items
    let totalEvents = (limitedEventDataMap[currentSessionId] || []).length;
    let totalResponses = (limitedResponseDataMap[currentSessionId] || []).length;

    // Limit events to prevent "Invalid string length" error
    const MAX_EVENTS = 5000;
    if (totalEvents > MAX_EVENTS) {
      console.warn(`[Web-Reel Export] Too many events (${totalEvents}), limiting to last ${MAX_EVENTS}`);
      limitedEventDataMap[currentSessionId] = limitedEventDataMap[currentSessionId].slice(-MAX_EVENTS);
      totalEvents = MAX_EVENTS;
    }

    console.log(`[Web-Reel Export] Exporting current session: ${totalEvents} events, ${totalResponses} requests`);

    if (totalEvents === 0 && totalResponses === 0) {
      console.warn('[Web-Reel Export] No data found for current session!');
      return;
    }

    if (useZip) {
      await exportToZip(limitedEventDataMap, limitedResponseDataMap);
    } else {
      await exportToFile(limitedEventDataMap, limitedResponseDataMap);
    }

    // Clear exported data after successful export
    if (clearAfterExport) {
      console.log('[Web-Reel Export] Clearing data...');
      try {
        await this.db.clearTable(DB_TABLE_NAME.RENDER_EVENT);
        await this.db.clearTable(DB_TABLE_NAME.RESPONSE_DATA);
        console.log('[Web-Reel Export] ✅ Data cleared');
      } catch (error) {
        console.error('[Web-Reel Export] ❌ Failed to clear data:', error);
      }
    }
  }

  /**
   * Upload session data to server
   * @param clearAfterUpload - Whether to clear data after successful upload (default: true)
   * @returns Promise with upload result
   */
  public async uploadLog(clearAfterUpload: boolean = true): Promise<void> {
    if (!this.config.uploadEndpoint) {
      throw new Error('[Web-Reel Upload] uploadEndpoint is not configured');
    }

    console.log('[Web-Reel Upload] Starting upload...');

    const eventDataMap = await this.db.getByIndexKey(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY);
    const responseDataMap = await this.db.getByIndexKey(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY);

    // Only upload current session to avoid data too large
    const currentSessionId = String(this.sessionId);
    const limitedEventDataMap =
      currentSessionId in eventDataMap ? { [currentSessionId]: eventDataMap[currentSessionId] } : {};
    const limitedResponseDataMap =
      currentSessionId in responseDataMap ? { [currentSessionId]: responseDataMap[currentSessionId] } : {};

    // Count total items
    let totalEvents = (limitedEventDataMap[currentSessionId] || []).length;
    let totalResponses = (limitedResponseDataMap[currentSessionId] || []).length;

    // Limit events to prevent "Invalid string length" error
    const MAX_EVENTS = 5000;
    if (totalEvents > MAX_EVENTS) {
      console.warn(`[Web-Reel Upload] Too many events (${totalEvents}), limiting to last ${MAX_EVENTS}`);
      limitedEventDataMap[currentSessionId] = limitedEventDataMap[currentSessionId].slice(-MAX_EVENTS);
      totalEvents = MAX_EVENTS;
    }

    console.log(`[Web-Reel Upload] Uploading current session: ${totalEvents} events, ${totalResponses} requests`);

    if (totalEvents === 0 && totalResponses === 0) {
      console.warn('[Web-Reel Upload] No data found for current session!');
      return;
    }

    try {
      // Prepare upload options
      const uploadOptions: UploadOptions = {
        endpoint: this.config.uploadEndpoint,
        headers: this.config.uploadHeaders,
        platform: this.config.platform,
        deviceId: this.config.deviceId,
        jiraId: this.config.jiraId,
        onProgress: (progress) => {
          console.log(`[Web-Reel Upload] Progress: ${progress.toFixed(1)}%`);
        },
        onSuccess: (response) => {
          console.log('[Web-Reel Upload] ✅ Upload successful:', response);
        },
        onError: (error) => {
          console.error('[Web-Reel Upload] ❌ Upload failed:', error);
        },
      };

      // Upload session data
      await uploadSession(limitedEventDataMap, limitedResponseDataMap, uploadOptions);

      // Clear uploaded data after successful upload
      if (clearAfterUpload) {
        console.log('[Web-Reel Upload] Clearing data...');
        try {
          await this.db.clearTable(DB_TABLE_NAME.RENDER_EVENT);
          await this.db.clearTable(DB_TABLE_NAME.RESPONSE_DATA);
          console.log('[Web-Reel Upload] ✅ Data cleared');
        } catch (clearError) {
          console.error('[Web-Reel Upload] ❌ Failed to clear data:', clearError);
        }
      }
    } catch (error) {
      console.error('[Web-Reel Upload] ❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload PV statistics
   */
  private async uploadPvStat(): Promise<void> {
    const pvStat: UserInfo = {
      appId: this.config.appId,
      deviceId: this.config.deviceId,
    };
    const apiPrefix = getApiPrefix(this.config.env);
    await uploadPvStat(apiPrefix, pvStat);
  }

  /**
   * Upload environment statistics
   */
  private async uploadEnvStat(): Promise<void> {
    const renderEventSize = await getRenderEventSize(this.db);
    const responseDataSize = await getResponseDataSize(this.db);

    const envStat: EnvStat = {
      appId: this.config.appId,
      deviceId: this.config.deviceId!,
      logSize: JSON.stringify({
        domEventSize: renderEventSize / 1024 / 1024,
        requestEventSize: responseDataSize / 1024 / 1024,
      }),
      ua: navigator.userAgent,
    };

    const apiPrefix = getApiPrefix(this.config.env);
    await uploadEnvStat(apiPrefix, envStat);
  }

  /**
   * Poll upload flag from server
   */
  private pollUploadFlag(delay: number): void {
    // Skip if stats not enabled
    if (!this.config.enableStats) {
      return;
    }

    const { appId, deviceId } = this.config;
    const apiPrefix = getApiPrefix(this.config.env);

    if (this.pollUploadFlagTimer) {
      clearTimeout(this.pollUploadFlagTimer);
    }

    const callback = async () => {
      try {
        const responseData = await getUploadLogFlag(apiPrefix, { appId, deviceId });

        if (responseData.errNo !== ErrNo.SUCCESS || responseData.data.uploadFlag === UFlag.CLOSE) {
          // Continue polling
          this.pollUploadFlagTimer = window.setTimeout(callback, delay);
        } else {
          // Upload flag is open
          if (!localStorage.getItem(LOCAL_UPLOADING_FLAG)) {
            localStorage.setItem(LOCAL_UPLOADING_FLAG, 'true');
            setUploadingSessionId(this.sessionId);
          } else {
            // Another tab is uploading, skip
            return;
          }

          // Upload session logs
          await this.uploadSessionLog();

          // Close upload flag
          await setUploadLogFlag(apiPrefix, {
            appId,
            deviceId: deviceId!,
            uploadFlag: UFlag.CLOSE,
          });

          // Clean up
          this.pollUploadFlagTimer = undefined;
          clearUploadingSessionId();
          localStorage.removeItem(LOCAL_UPLOADING_FLAG);
        }
      } catch (error) {
        // Silently ignore API errors when backend is not available
        console.debug('[Web-Reel] Upload flag polling skipped (no backend)', error);
      }
    };

    this.pollUploadFlagTimer = window.setTimeout(callback, delay);
  }

  /**
   * Upload session logs to server
   */
  private async uploadSessionLog(): Promise<void> {
    const sessionIds = await this.db.getAllIndexKeys(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY);
    sessionIds.sort((a, b) => b - a); // Sort descending

    const { appId, deviceId } = this.config;
    const apiPrefix = getApiPrefix(this.config.env);

    for (const sessionId of sessionIds) {
      const domData: eventWithTime[] = await this.db.getDataByIndexValue(
        DB_TABLE_NAME.RENDER_EVENT,
        DB_INDEX_KEY,
        sessionId,
      );
      const networkData: HarEntry[] = await this.db.getDataByIndexValue(
        DB_TABLE_NAME.RESPONSE_DATA,
        DB_INDEX_KEY,
        sessionId,
      );

      // Calculate end time
      const minTime = 0;
      const lastDomData = domData[domData.length - 1];
      const lastDomDataTime = lastDomData ? lastDomData.timestamp : minTime;
      const lastNetworkData = networkData[networkData.length - 1];
      const lastNetworkDataTime = lastNetworkData ? Date.parse(lastNetworkData.startedDateTime) : minTime;
      const endTime = Math.max(lastDomDataTime, lastNetworkDataTime);

      try {
        const payload: SessionLogPayload = {
          appId,
          deviceId: deviceId!,
          sessionId,
          domData: JSON.stringify(domData),
          networkData: JSON.stringify(networkData),
          beginTime: sessionId,
          endTime,
        };

        const uploadResult = await uploadSessionLog(apiPrefix, payload);

        if (uploadResult.errNo === ErrNo.SUCCESS) {
          // Delete uploaded data
          await this.db.deleteDataByIndexValue(DB_TABLE_NAME.RENDER_EVENT, DB_INDEX_KEY, sessionId);
          await this.db.deleteDataByIndexValue(DB_TABLE_NAME.RESPONSE_DATA, DB_INDEX_KEY, sessionId);
        }
      } catch (error) {
        console.error(`[Web-Reel] Failed to upload session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Stop recording
   */
  public stop(): void {
    if (this.stopRecordingFn) {
      this.stopRecordingFn();
    }

    if (this.networkInterceptor) {
      this.networkInterceptor.uninstall();
    }

    if (this.urlInterceptor) {
      this.urlInterceptor.uninstall();
    }

    if (this.pollUploadFlagTimer) {
      clearTimeout(this.pollUploadFlagTimer);
      this.pollUploadFlagTimer = undefined;
    }

    if (this.entryButton) {
      this.entryButton.destroy();
    }
  }

  /**
   * Get current session ID
   */
  public getSessionId(): number {
    return this.sessionId;
  }

  /**
   * Get database instance
   */
  public getDB(): IDB {
    return this.db;
  }

  /**
   * Check if recorder is fully initialized
   */
  public isInitialized(): boolean {
    return this.isReady && !!this.db;
  }
}

// Export for convenience
export default WebReelRecorder;
