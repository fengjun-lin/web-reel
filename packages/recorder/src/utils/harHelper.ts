import type { HarHeader, HarQueryString } from '../types/har'

const NOT_AVAILABLE = 'NOT_AVAILABLE'

/**
 * Parse query string from URL
 */
export function getHarQueryString(url: string): HarQueryString[] {
  try {
    const query = url.split('?')?.[1]
    const pairs = query?.split('&')

    if (!pairs || !pairs.length) {
      return []
    }

    return pairs.map((pair) => {
      const [name, value] = pair.split('=')
      return {
        name: decodeURIComponent(name || ''),
        value: decodeURIComponent(value || ''),
      }
    })
  } catch (error) {
    console.warn('[HAR] Failed to parse query string:', error)
    return []
  }
}

/**
 * Convert Headers object to HAR header format
 */
export function headersToHar(headers: Headers): HarHeader[] {
  if (!headers || !headers.entries) {
    return []
  }
  
  try {
    return Array.from(headers.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  } catch (error) {
    console.warn('[HAR] Failed to convert headers:', error)
    return []
  }
}

/**
 * Convert plain object headers to HAR format
 */
export function objectHeadersToHar(headers: Record<string, string>): HarHeader[] {
  if (!headers || !Object.keys(headers).length) {
    return []
  }

  return Object.keys(headers).map((name) => ({
    name,
    value: headers[name] || '',
  }))
}

/**
 * Get current ISO timestamp
 */
export function getISOTimestamp(time?: number): string {
  return new Date(time || Date.now()).toISOString()
}

/**
 * Calculate time difference in milliseconds
 */
export function getTimeDiff(startTime: number, endTime: number): number {
  return Math.max(0, endTime - startTime)
}

export { NOT_AVAILABLE }
