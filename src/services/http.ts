import { Env, ErrNoType, ResponseV } from '@/types'

// API prefix configuration
export const API_PREFIX_TEST = 'http://localhost:3000/api'
export const API_PREFIX_ONLINE = 'http://localhost:3000/api'

/**
 * Get API prefix based on environment
 */
export function getApiPrefix(env: Env): string {
  return env === Env.TEST ? API_PREFIX_TEST : env === Env.ONLINE ? API_PREFIX_ONLINE : API_PREFIX_TEST
}

/**
 * Convert object to query string
 */
export function getQueryParams(params: Record<string, any>): string {
  return Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    .join('&')
}

/**
 * HTTP request options
 */
export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  retries?: number
  retryDelay?: number
}

/**
 * Make HTTP request with error handling
 */
export async function httpRequest<T = any>(
  url: string,
  options: HttpOptions = {}
): Promise<ResponseV<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    retries = 1,
    retryDelay = 1000,
  } = options

  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  })

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ResponseV<T> = await response.json()
      return data
    } catch (error) {
      lastError = error as Error
      
      if (attempt < retries) {
        console.warn(`[HTTP] Request failed, retrying (${attempt + 1}/${retries})...`, error)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  // If all retries failed, return error response
  console.error('[HTTP] Request failed after all retries:', lastError)
  return {
    errNo: ErrNoType.UNEXPECTED_ERROR,
    errStr: lastError?.message || 'Unknown error',
    data: null as any,
  }
}

/**
 * HTTP GET request
 */
export async function httpGet<T = any>(
  url: string,
  params?: Record<string, any>,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<ResponseV<T>> {
  const queryString = params ? `?${getQueryParams(params)}` : ''
  return httpRequest<T>(`${url}${queryString}`, { ...options, method: 'GET' })
}

/**
 * HTTP POST request
 */
export async function httpPost<T = any>(
  url: string,
  body?: any,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<ResponseV<T>> {
  return httpRequest<T>(url, { ...options, method: 'POST', body })
}
