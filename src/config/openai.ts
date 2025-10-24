/**
 * OpenAI Configuration
 *
 * Security Notice:
 * - API keys are stored in .env.local (not committed to git)
 * - Alternatively, users can configure at runtime via UI
 * - Runtime config takes precedence over env variables
 */

export interface OpenAIConfig {
  apiKey: string;
  apiBase?: string;
  model?: string;
}

// Storage key for runtime configuration
const STORAGE_KEY = 'web-reel-openai-config';

/**
 * Get OpenAI configuration from environment variables
 * Note: This only works on the server side for OPENAI_API_KEY
 * Client-side code should use the API endpoint /api/openai/config
 */
export function getEnvConfig(): Partial<OpenAIConfig> {
  // Check if we're on the server side
  const isServer = typeof window === 'undefined';

  return {
    apiKey: isServer ? process.env.OPENAI_API_KEY : undefined,
    apiBase: process.env.NEXT_PUBLIC_OPENAI_API_BASE || 'https://api.openai.com/v1',
    model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
  };
}

/**
 * Check if environment has API key configured (client-safe)
 * This function fetches from the server API to check configuration status
 */
export async function checkEnvConfig(): Promise<{ hasApiKey: boolean; apiBase: string; model: string }> {
  try {
    const response = await fetch('/api/openai/config');
    const data = await response.json();
    if (data.success) {
      return {
        hasApiKey: data.config.hasApiKey,
        apiBase: data.config.apiBase,
        model: data.config.model,
      };
    }
    return { hasApiKey: false, apiBase: '', model: '' };
  } catch (error) {
    console.error('Failed to check env config:', error);
    return { hasApiKey: false, apiBase: '', model: '' };
  }
}

/**
 * Get OpenAI configuration from localStorage (runtime config)
 */
export function getRuntimeConfig(): Partial<OpenAIConfig> | null {
  // Check if we're in the browser (client-side)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load OpenAI config from localStorage:', error);
    return null;
  }
}

/**
 * Save OpenAI configuration to localStorage
 */
export function saveRuntimeConfig(config: Partial<OpenAIConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save OpenAI config to localStorage:', error);
    throw error;
  }
}

/**
 * Clear runtime configuration
 */
export function clearRuntimeConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get merged configuration (runtime config takes precedence)
 * This works on both client and server side
 */
export function getOpenAIConfig(): OpenAIConfig {
  const envConfig = getEnvConfig();
  const runtimeConfig = getRuntimeConfig();

  const merged = {
    ...envConfig,
    ...runtimeConfig,
  };

  if (!merged.apiKey) {
    throw new Error('OpenAI API key is not configured. Please set it in .env.local or via Settings.');
  }

  return merged as OpenAIConfig;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  try {
    const config = getOpenAIConfig();
    return !!config.apiKey;
  } catch {
    return false;
  }
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey) return false;
  // OpenAI API keys start with 'sk-' and have a certain length
  return apiKey.startsWith('sk-') && apiKey.length > 20;
}
