import { record } from 'rrweb';
import type { eventWithTime } from 'rrweb/typings/types';

import { DB_INDEX_KEY, DB_TABLE_NAME } from './constants/db';
import { LOCAL_UPLOADING_FLAG, UNKNOWN_DEVICE_ID } from './constants/session';
import { exportToFile } from './export';
import type { RecordCollection } from './export';
import { importFromFile } from './import';
import { NetworkInterceptor, URLInterceptor } from './interceptors';
import { getUploadLogFlag, setUploadLogFlag, uploadEnvStat, uploadPvStat, uploadSessionLog } from './services/api';
import { getApiPrefix } from './services/http';
import type { EnvStat, RecorderOption, SessionLogPayload, UserInfo } from './types';
import { ErrNoType as ErrNo, UploadFlag as UFlag } from './types';
import type { HarEntry } from './types/har';
import { EntryButton } from './ui';
import { uploadSession } from './upload';
import type { UploadOptions } from './upload';
import { compatibilityJudge } from './utils/browser';
import { IDB } from './utils/db';
import { cleanOldData, getRenderEventSize, getResponseDataSize, initDB } from './utils/dbHelper';
import { clearUploadingSessionId, getUploadingSessionId, setUploadingSessionId } from './utils/session';

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
    // Skip initialization in non-browser environments (SSR)
    if (typeof window === 'undefined') {
      console.warn('[Web-Reel] Skipping initialization in non-browser environment (SSR)');
      this.config = config;
      this.sessionId = 0;
      return;
    }

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

    console.log('[Web-Reel] Welcome to Web-Reel user behavior recording tool');

    // Start setup
    this.setup();
  }

  /**
   * Parse and validate configuration
   */
  private parseConfig(config: RecorderConfig): RecorderConfig {
    // Set default upload endpoint based on environment if not provided
    let uploadEndpoint = config.uploadEndpoint;
    if (!uploadEndpoint && config.env === 'online') {
      // Default production endpoint
      uploadEndpoint = 'https://tubi-web-reel.vercel.app/api/sessions';
      console.log('[Web-Reel] Using default production upload endpoint');
    }

    return {
      ...config,
      recordInterval: config.recordInterval ?? 2, // Default 2 days
      disabledDownLoad: config.disabledDownLoad ?? false,
      enableStats: config.enableStats ?? false, // Default disabled
      uploadEndpoint,
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
    console.log('[Web-Reel] Recording started successfully');
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

    console.log(`[Web-Reel] Entry button initialized in ${isUploadMode ? 'upload' : 'download'} mode`);
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
    console.log('[Web-Reel] Network interceptor initialized');
  }

  /**
   * Initialize rrweb recording
   */
  private initializeRecording(): void {
    // Create a console interceptor for rrweb < 2.0
    const consoleRecord = this.createConsoleRecordPlugin();

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

              console.log(`[Web-Reel] Cleaned up ${eventsToDelete.length} old events (keeping last ${MAX_EVENTS})`);
              eventCount = MAX_EVENTS;
            }
          } catch (error) {
            console.error('[Web-Reel] Failed to cleanup old events:', error);
          }
        }
      },
      // Try both ways to enable console recording
      recordLog: true,
      plugins: consoleRecord ? [consoleRecord] : [],
    } as any);

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

    // This will be intercepted by our console recorder
    console.log('[Web-Reel] rrweb recording initialized with console logging');
  }

  /**
   * Initialize URL interceptor
   */
  private initializeURLInterceptor(): void {
    this.urlInterceptor = new URLInterceptor({
      onURLChange: (url, trigger) => {
        console.log(`[Web-Reel] URL changed (${trigger}): ${url}`);

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
    console.log('[Web-Reel] URL interceptor initialized');
  }

  /**
   * Create console record plugin for rrweb < 2.0
   */
  private createConsoleRecordPlugin() {
    // Manual console interceptor as fallback
    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    try {
      const emit = (level: string, ...args: any[]) => {
        // Emit as rrweb plugin event
        const event = {
          type: 6,
          data: {
            plugin: 'rrweb/console@1',
            payload: {
              level,
              payload: args,
              trace: [],
            },
          },
          timestamp: Date.now(),
        };

        // Save to database directly
        this.db
          .add(
            {
              [DB_INDEX_KEY]: this.sessionId,
              ...event,
            },
            DB_TABLE_NAME.RENDER_EVENT,
          )
          .catch(() => {
            // Silently ignore errors to avoid console spam
          });
      };

      // Intercept console methods
      (console as any).log = (...args: any[]) => {
        originalConsole.log.apply(console, args);
        emit('log', ...args);
      };
      (console as any).info = (...args: any[]) => {
        originalConsole.info.apply(console, args);
        emit('info', ...args);
      };
      (console as any).warn = (...args: any[]) => {
        originalConsole.warn.apply(console, args);
        emit('warn', ...args);
      };
      (console as any).error = (...args: any[]) => {
        originalConsole.error.apply(console, args);
        emit('error', ...args);
      };
      (console as any).debug = (...args: any[]) => {
        originalConsole.debug.apply(console, args);
        emit('debug', ...args);
      };

      return null; // No plugin needed, we handle it manually
    } catch {
      // Silently ignore errors
      return null;
    }
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

    // Ignore SDK's own API calls
    if (url.includes(apiPrefix)) {
      return true;
    }

    // Ignore upload endpoint to prevent recording our own upload requests
    if (this.config.uploadEndpoint && url.includes(this.config.uploadEndpoint)) {
      return true;
    }

    return false;
  }

  /**
   * Export all session data as ZIP or JSON file
   * @param clearAfterExport - Whether to clear data after export (default: true)
   * @param format - Export format ('zip' or 'json'), defaults to 'zip'
   */
  public async exportLog(clearAfterExport: boolean = true, format: 'zip' | 'json' = 'zip'): Promise<void> {
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

    await exportToFile(limitedEventDataMap, limitedResponseDataMap, format);

    // Clear exported data after successful export
    if (clearAfterExport) {
      console.log('[Web-Reel Export] Clearing data...');
      try {
        await this.db.clearTable(DB_TABLE_NAME.RENDER_EVENT);
        await this.db.clearTable(DB_TABLE_NAME.RESPONSE_DATA);
        console.log('[Web-Reel Export] ✅ Data cleared');
      } catch (clearError) {
        console.error('[Web-Reel Export] ❌ Failed to clear data:', clearError);
      }
    }
  }

  /**
   * Import session data from a ZIP or JSON file
   * @param file - The file to import (.zip or .json)
   * @param clearBeforeImport - Whether to clear existing data before import (default: false)
   * @returns Promise with import status
   */
  public async importLog(file: File, clearBeforeImport: boolean = false): Promise<void> {
    console.log('[Web-Reel Import] Starting import...');

    try {
      // Clear existing data if requested
      if (clearBeforeImport) {
        console.log('[Web-Reel Import] Clearing existing data...');
        await this.db.clearTable(DB_TABLE_NAME.RENDER_EVENT);
        await this.db.clearTable(DB_TABLE_NAME.RESPONSE_DATA);
      }

      // Import data from file
      const collection: RecordCollection = await importFromFile(file);

      // Save imported data to database
      let totalEvents = 0;
      let totalResponses = 0;

      for (const sessionId of Object.keys(collection)) {
        const sessionData = collection[sessionId];
        if (!sessionData) continue;

        const { eventData, responseData } = sessionData;

        // Add events
        for (const event of eventData) {
          await this.db.add(
            {
              [DB_INDEX_KEY]: Number(sessionId),
              ...event,
            },
            DB_TABLE_NAME.RENDER_EVENT,
          );
          totalEvents++;
        }

        // Add responses
        for (const response of responseData) {
          await this.db.add(
            {
              [DB_INDEX_KEY]: Number(sessionId),
              ...response,
            },
            DB_TABLE_NAME.RESPONSE_DATA,
          );
          totalResponses++;
        }
      }

      console.log(`[Web-Reel Import] ✅ Import completed: ${totalEvents} events, ${totalResponses} requests`);
    } catch (error) {
      console.error('[Web-Reel Import] ❌ Import failed:', error);
      throw error;
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
      // Show circular progress indicator
      const progressIndicator = this.showUploadProgress();

      // Prepare upload options
      const uploadOptions: UploadOptions = {
        endpoint: this.config.uploadEndpoint,
        headers: this.config.uploadHeaders,
        platform: this.config.platform,
        deviceId: this.config.deviceId,
        jiraId: this.config.jiraId,
        onProgress: (progress) => {
          console.log(`[Web-Reel Upload] Progress: ${progress.toFixed(1)}%`);
          progressIndicator.updateProgress(progress);
        },
        onSuccess: (response) => {
          console.log('[Web-Reel Upload] ✅ Upload successful:', response);
          progressIndicator.remove();

          // Show replay link if session id is available
          if (response.session?.id) {
            const replayUrl = `https://tubi-web-reel.vercel.app/replayer/${response.session.id}`;
            console.log(`[Web-Reel Upload] 🎬 View replay: ${replayUrl}`);

            // Show browser notification with clickable link
            this.showUploadSuccessNotification(replayUrl);
          }
        },
        onError: (error) => {
          console.error('[Web-Reel Upload] ❌ Upload failed:', error);
          progressIndicator.remove();
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
   * Show circular upload progress indicator inside button
   */
  private showUploadProgress() {
    const buttonElement = this.entryButton?.getElement();
    if (!buttonElement) {
      return {
        updateProgress: () => {},
        remove: () => {},
      };
    }

    // Hide the SVG icon
    const svgIcon = buttonElement.querySelector('svg');
    if (svgIcon) {
      (svgIcon as SVGElement).style.display = 'none';
    }

    // Create circular progress wrapper
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'web-reel-progress-wrapper';
    progressWrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2;
      pointer-events: none;
    `;

    // SVG circle progress - conservative size to fit inside button with border-radius
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    svg.style.cssText = 'transform: rotate(-90deg);';

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '16');
    bgCircle.setAttribute('cy', '16');
    bgCircle.setAttribute('r', '13');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
    bgCircle.setAttribute('stroke-width', '2.5');

    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '16');
    progressCircle.setAttribute('cy', '16');
    progressCircle.setAttribute('r', '13');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', 'white');
    progressCircle.setAttribute('stroke-width', '2.5');
    progressCircle.setAttribute('stroke-linecap', 'round');

    const circumference = 2 * Math.PI * 13;
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${circumference}`;
    progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);

    // Percentage text (smaller, inside the circle)
    const percentText = document.createElement('div');
    percentText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 10px;
      font-weight: 700;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    `;
    percentText.textContent = '0%';

    progressWrapper.appendChild(svg);
    progressWrapper.appendChild(percentText);

    // Add to button
    buttonElement.appendChild(progressWrapper);

    // Return controller
    return {
      updateProgress: (progress: number) => {
        const offset = circumference - (progress / 100) * circumference;
        progressCircle.style.strokeDashoffset = `${offset}`;
        percentText.textContent = `${Math.round(progress)}%`;
      },
      remove: () => {
        // Remove progress wrapper
        if (progressWrapper.parentNode) {
          progressWrapper.parentNode.removeChild(progressWrapper);
        }
        // Show SVG icon again
        if (svgIcon) {
          (svgIcon as SVGElement).style.display = '';
        }
      },
    };
  }

  /**
   * Show upload success notification with replay link
   */
  private showUploadSuccessNotification(replayUrl: string): void {
    // Create a custom notification toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 100001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      max-width: 400px;
      cursor: pointer;
      transition: all 0.3s ease;
      animation: slideInDown 0.5s ease;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 32px;">🎬</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">Upload Successful!</div>
          <div style="font-size: 13px; opacity: 0.9;">Click here to view the replay</div>
        </div>
        <div style="font-size: 20px;">→</div>
      </div>
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInDown {
        from {
          transform: translateY(-100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideOutUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Add hover effect
    toast.addEventListener('mouseenter', () => {
      toast.style.transform = 'scale(1.05)';
      toast.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.5), 0 6px 20px rgba(0, 0, 0, 0.25)';
    });

    toast.addEventListener('mouseleave', () => {
      toast.style.transform = 'scale(1)';
      toast.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)';
    });

    // Click to open replay
    toast.addEventListener('click', () => {
      window.open(replayUrl, '_blank');
      removeToast();
    });

    // Add to page
    document.body.appendChild(toast);

    // Auto remove after 15 seconds
    const removeToast = () => {
      toast.style.animation = 'slideOutUp 0.5s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 500);
    };

    setTimeout(removeToast, 15000);

    // Also try browser notification as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Web-Reel: Upload Successful! 🎬', {
        body: 'Click to view the replay',
        icon: 'https://tubi-web-reel.vercel.app/icon-reel.png',
        tag: 'web-reel-upload',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.open(replayUrl, '_blank');
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 10000);
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
          console.log(`[Web-Reel] Session ${sessionId} uploaded successfully`);
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
      console.log('[Web-Reel] Recording stopped');
    }

    if (this.networkInterceptor) {
      this.networkInterceptor.uninstall();
      console.log('[Web-Reel] Network interceptor uninstalled');
    }

    if (this.urlInterceptor) {
      this.urlInterceptor.uninstall();
      console.log('[Web-Reel] URL interceptor uninstalled');
    }

    if (this.pollUploadFlagTimer) {
      clearTimeout(this.pollUploadFlagTimer);
      this.pollUploadFlagTimer = undefined;
    }

    if (this.entryButton) {
      this.entryButton.destroy();
      console.log('[Web-Reel] Entry button destroyed');
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
