/**
 * Jira Configuration
 *
 * Security Notice:
 * - API keys are stored in .env.local (not committed to git)
 * - Alternatively, users can configure at runtime via UI
 * - Runtime config takes precedence over env variables
 */

export interface JiraConfig {
  apiKey: string;
  domain: string;
  userEmail: string;
  projectKey: string;
}

// Storage key for runtime configuration
const STORAGE_KEY = 'web-reel-jira-config';

/**
 * Get Jira configuration from environment variables
 */
export function getEnvConfig(): Partial<JiraConfig> {
  return {
    apiKey: process.env.JIRA_API_KEY,
    userEmail: process.env.JIRA_USER_EMAIL,
    domain: process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'web-reel.atlassian.net',
    projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || 'WR',
  };
}

/**
 * Get Jira configuration from localStorage (runtime config)
 */
export function getRuntimeConfig(): Partial<JiraConfig> | null {
  // Check if we're in the browser (client-side)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load Jira config from localStorage:', error);
    return null;
  }
}

/**
 * Save Jira configuration to localStorage
 */
export function saveRuntimeConfig(config: Partial<JiraConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save Jira config to localStorage:', error);
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
 */
export function getJiraConfig(): JiraConfig {
  const envConfig = getEnvConfig();
  const runtimeConfig = getRuntimeConfig();

  const merged = {
    ...envConfig,
    ...runtimeConfig,
  };

  if (!merged.apiKey) {
    throw new Error('Jira API key is not configured. Please set it in .env.local or via Settings.');
  }

  if (!merged.domain) {
    throw new Error('Jira domain is not configured. Please set it in .env.local or via Settings.');
  }

  if (!merged.userEmail) {
    throw new Error('Jira user email is not configured. Please set it in .env.local or via Settings.');
  }

  if (!merged.projectKey) {
    throw new Error('Jira project key is not configured. Please set it in .env.local or via Settings.');
  }

  return merged as JiraConfig;
}

/**
 * Check if Jira is configured
 */
export function isJiraConfigured(): boolean {
  try {
    const config = getJiraConfig();
    return !!(config.apiKey && config.domain && config.userEmail && config.projectKey);
  } catch {
    return false;
  }
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey) return false;
  // Jira API tokens are typically long alphanumeric strings
  return apiKey.length > 10;
}
