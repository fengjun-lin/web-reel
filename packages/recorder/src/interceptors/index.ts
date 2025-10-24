import type { HarEntry } from '../types/har';

import { installFetchInterceptor } from './fetch';
import { installXhrInterceptor } from './xhr';

export interface InterceptorConfig {
  // Called when a request starts
  onRequestStart?: (_url: string, _timestamp: number) => void;
  // Called when request completes with HAR entry
  onRequestComplete?: (_entry: HarEntry) => void;
  // Filter function to ignore certain URLs
  shouldIgnore?: (_url: string) => boolean;
}

/**
 * Network interceptor manager
 */
export class NetworkInterceptor {
  private config: InterceptorConfig;
  private uninstallXhr?: () => void;
  private uninstallFetch?: () => void;
  private isInstalled = false;

  constructor(config: InterceptorConfig) {
    this.config = config;
  }

  /**
   * Install both XHR and Fetch interceptors
   */
  install(): void {
    if (this.isInstalled) {
      console.warn('[NetworkInterceptor] Already installed, skipping...');
      return;
    }

    console.log('[NetworkInterceptor] Installing interceptors...');

    // Install XHR interceptor
    this.uninstallXhr = installXhrInterceptor({
      onRequest: (data) => {
        if (this.shouldIgnoreUrl(data.url)) {
          return;
        }
        this.config.onRequestStart?.(data.url, data.startTime);
      },
      onResponse: (entry) => {
        if (this.shouldIgnoreUrl(entry.request.url)) {
          return;
        }
        this.config.onRequestComplete?.(entry);
      },
      onError: (entry) => {
        if (this.shouldIgnoreUrl(entry.request.url)) {
          return;
        }
        this.config.onRequestComplete?.(entry);
      },
    });

    // Install Fetch interceptor
    this.uninstallFetch = installFetchInterceptor({
      onBeforeRequest: (data) => {
        if (this.shouldIgnoreUrl(data.url)) {
          return;
        }
        this.config.onRequestStart?.(data.url, data.startTime);
      },
      onRequestSuccess: (entry) => {
        if (this.shouldIgnoreUrl(entry.request.url)) {
          return;
        }
        this.config.onRequestComplete?.(entry);
      },
      onRequestFailure: (entry) => {
        if (this.shouldIgnoreUrl(entry.request.url)) {
          return;
        }
        this.config.onRequestComplete?.(entry);
      },
    });

    this.isInstalled = true;
    console.log('[NetworkInterceptor] Interceptors installed successfully');
  }

  /**
   * Uninstall both interceptors
   */
  uninstall(): void {
    if (!this.isInstalled) {
      console.warn('[NetworkInterceptor] Not installed, skipping uninstall...');
      return;
    }

    console.log('[NetworkInterceptor] Uninstalling interceptors...');

    this.uninstallXhr?.();
    this.uninstallFetch?.();

    this.uninstallXhr = undefined;
    this.uninstallFetch = undefined;
    this.isInstalled = false;

    console.log('[NetworkInterceptor] Interceptors uninstalled successfully');
  }

  /**
   * Check if a URL should be ignored
   */
  private shouldIgnoreUrl(url: string): boolean {
    if (!this.config.shouldIgnore) {
      return false;
    }
    return this.config.shouldIgnore(url);
  }

  /**
   * Check if interceptors are installed
   */
  isActive(): boolean {
    return this.isInstalled;
  }
}

// Export URL interceptor
export { URLInterceptor } from './url';
export type { URLChangeHandler } from './url';

// Export types
export type { HarEntry };
