/**
 * OpenAI API Key Pool Manager
 * Manages multiple API keys with load balancing and failover
 */

export interface KeyInfo {
  apiKey: string;
  accountId: string; // Optional identifier
  isHealthy: boolean;
  lastError?: string;
  lastErrorTime?: number;
  requestCount: number;
  errorCount: number;
}

export class OpenAIKeyPool {
  private keys: KeyInfo[] = [];
  private currentIndex = 0;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private readonly HEALTH_CHECK_DELAY = 5 * 60 * 1000; // 5 minutes
  private readonly ERROR_COOLDOWN = 60 * 1000; // 1 minute cooldown after error

  constructor(apiKeys: string[]) {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error('At least one API key is required');
    }

    this.keys = apiKeys.map((key, index) => ({
      apiKey: key,
      accountId: `account-${index + 1}`,
      isHealthy: true,
      requestCount: 0,
      errorCount: 0,
    }));

    console.log(`[OpenAIKeyPool] Initialized with ${this.keys.length} API keys`);
  }

  /**
   * Get next available API key (round-robin)
   */
  getNextKey(): string {
    const availableKeys = this.keys.filter((k) => k.isHealthy);

    if (availableKeys.length === 0) {
      // All keys are unhealthy, reset all
      console.warn('[OpenAIKeyPool] All keys unhealthy, resetting health status');
      this.keys.forEach((k) => {
        k.isHealthy = true;
        k.lastError = undefined;
        k.lastErrorTime = undefined;
      });
      return this.keys[this.currentIndex % this.keys.length].apiKey;
    }

    const key = availableKeys[this.currentIndex % availableKeys.length];
    this.currentIndex = (this.currentIndex + 1) % availableKeys.length;

    return key.apiKey;
  }

  /**
   * Get next key with info for logging
   */
  getNextKeyWithInfo(): { apiKey: string; accountId: string } {
    const availableKeys = this.keys.filter((k) => k.isHealthy);

    let keyInfo: KeyInfo;
    if (availableKeys.length === 0) {
      // All keys unhealthy, reset and use first
      console.warn('[OpenAIKeyPool] All keys unhealthy, resetting');
      this.resetAllKeys();
      keyInfo = this.keys[0];
    } else {
      keyInfo = availableKeys[this.currentIndex % availableKeys.length];
      this.currentIndex = (this.currentIndex + 1) % availableKeys.length;
    }

    keyInfo.requestCount++;
    return {
      apiKey: keyInfo.apiKey,
      accountId: keyInfo.accountId,
    };
  }

  /**
   * Mark a key as failed (called on 429 or auth errors)
   */
  markKeyFailed(apiKey: string, error: string) {
    const keyInfo = this.keys.find((k) => k.apiKey === apiKey);
    if (!keyInfo) return;

    keyInfo.isHealthy = false;
    keyInfo.lastError = error;
    keyInfo.lastErrorTime = Date.now();
    keyInfo.errorCount++;

    console.error(`[OpenAIKeyPool] Key ${keyInfo.accountId} marked as failed: ${error}`);
    console.log(`[OpenAIKeyPool] Available keys: ${this.keys.filter((k) => k.isHealthy).length}/${this.keys.length}`);

    // Schedule health check recovery
    setTimeout(() => {
      this.checkKeyHealth(keyInfo);
    }, this.ERROR_COOLDOWN);
  }

  /**
   * Check and restore key health after cooldown
   */
  private checkKeyHealth(keyInfo: KeyInfo) {
    if (!keyInfo.lastErrorTime) return;

    const timeSinceError = Date.now() - keyInfo.lastErrorTime;
    if (timeSinceError >= this.ERROR_COOLDOWN) {
      console.log(`[OpenAIKeyPool] Restoring ${keyInfo.accountId} to healthy pool`);
      keyInfo.isHealthy = true;
      keyInfo.lastError = undefined;
      keyInfo.lastErrorTime = undefined;
    }
  }

  /**
   * Reset all keys to healthy
   */
  private resetAllKeys() {
    this.keys.forEach((k) => {
      k.isHealthy = true;
      k.lastError = undefined;
      k.lastErrorTime = undefined;
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.keys.length,
      healthy: this.keys.filter((k) => k.isHealthy).length,
      unhealthy: this.keys.filter((k) => !k.isHealthy).length,
      keys: this.keys.map((k) => ({
        accountId: k.accountId,
        healthy: k.isHealthy,
        lastError: k.lastError,
        requestCount: k.requestCount,
        errorCount: k.errorCount,
      })),
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Singleton instance
let keyPoolInstance: OpenAIKeyPool | null = null;

/**
 * Initialize the key pool from environment variables
 */
export function initializeKeyPool(): OpenAIKeyPool {
  if (keyPoolInstance) {
    return keyPoolInstance;
  }

  const keysString = process.env.OPENAI_API_KEYS;
  let keys: string[] = [];

  if (keysString && keysString.includes(',')) {
    // Multiple keys provided
    keys = keysString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.startsWith('sk-'));
    console.log(`[OpenAIKeyPool] Using OPENAI_API_KEYS with ${keys.length} keys`);
  } else {
    // Fallback to single key or legacy OPENAI_API_KEY
    const singleKey = keysString || process.env.OPENAI_API_KEY;
    if (singleKey) {
      keys = [singleKey];
      console.log('[OpenAIKeyPool] Using single API key');
    }
  }

  if (keys.length === 0) {
    throw new Error('No valid OpenAI API keys found in environment variables');
  }

  keyPoolInstance = new OpenAIKeyPool(keys);
  return keyPoolInstance;
}

/**
 * Get the singleton key pool instance
 */
export function getKeyPool(): OpenAIKeyPool {
  if (!keyPoolInstance) {
    return initializeKeyPool();
  }
  return keyPoolInstance;
}
