import type { HarContent, HarEntry, HarPostData, HarRequest, HarResponse } from '../types/har'
import {
  getHarQueryString,
  getISOTimestamp,
  getTimeDiff,
  headersToHar,
  NOT_AVAILABLE,
} from '../utils/harHelper'

const REQUEST_TYPE = 'fetch'

interface FetchRequestData {
  url: string
  method: string
  headers: Headers
  body?: any
  startTime: number
  endTime?: number
}

interface FetchConfig {
  onBeforeRequest?: (_data: FetchRequestData) => void
  onRequestSuccess?: (_entry: HarEntry) => void
  onRequestFailure?: (_entry: HarEntry) => void
}

// Store original fetch
const originalFetch = window.fetch

/**
 * Create HAR entry from Fetch data
 */
async function createHarEntry(
  requestData: FetchRequestData,
  response: Response
): Promise<HarEntry> {
  const request: HarRequest = {
    method: requestData.method,
    url: requestData.url,
    httpVersion: NOT_AVAILABLE,
    cookies: [],
    headers: headersToHar(requestData.headers),
    queryString: getHarQueryString(requestData.url),
    postData: createPostData(requestData),
    headersSize: -1,
    bodySize: -1,
  }

  const harResponse: HarResponse = {
    status: response.status,
    statusText: response.statusText,
    httpVersion: NOT_AVAILABLE,
    cookies: [],
    headers: headersToHar(response.headers),
    content: await createResponseContent(response),
    redirectURL: '',
    headersSize: -1,
    bodySize: -1,
  }

  const entry: HarEntry = {
    _type: REQUEST_TYPE,
    startedDateTime: getISOTimestamp(requestData.startTime),
    time: getTimeDiff(requestData.startTime, requestData.endTime || Date.now()),
    request,
    response: harResponse,
    cache: {},
    timings: {
      send: 0,
      wait: 0,
      receive: 0,
    },
  }

  return entry
}

/**
 * Create POST data for HAR format
 */
function createPostData(requestData: FetchRequestData): HarPostData | undefined {
  if (!requestData.body) {
    return undefined
  }

  const text = typeof requestData.body === 'string' ? requestData.body : JSON.stringify(requestData.body)
  const mimeType = requestData.headers.get('Content-Type') || 'text/plain'

  return {
    mimeType,
    params: [],
    text,
  }
}

/**
 * Create response content for HAR format
 */
async function createResponseContent(response: Response): Promise<HarContent> {
  const contentType = response.headers.get('Content-Type') || ''
  const contentLength = response.headers.get('Content-Length')
  const size = contentLength ? parseInt(contentLength, 10) : 0

  let text = ''
  try {
    // Clone response to avoid consuming the stream
    const clonedResponse = response.clone()
    text = await clonedResponse.text()
  } catch (error) {
    console.warn('[Fetch Interceptor] Failed to read response body:', error)
  }

  return {
    size,
    mimeType: contentType,
    text,
  }
}

/**
 * Install Fetch interceptor
 */
export function installFetchInterceptor(config: FetchConfig): () => void {
  // eslint-disable-next-line no-undef
  window.fetch = function (input: string | Request | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method || 'GET'
    const headers = new Headers(init?.headers)
    
    const requestData: FetchRequestData = {
      url,
      method: method.toUpperCase(),
      headers,
      body: init?.body,
      startTime: Date.now(),
    }

    // Call onBeforeRequest hook
    config.onBeforeRequest?.(requestData)

    // Call original fetch
    return originalFetch(input, init).then(
      async (response) => {
        requestData.endTime = Date.now()
        
        // Create HAR entry (async)
        const entry = await createHarEntry(requestData, response)
        
        // Call appropriate hook based on response status
        if (response.ok) {
          config.onRequestSuccess?.(entry)
        } else {
          config.onRequestFailure?.(entry)
        }

        return response
      },
      (error) => {
        requestData.endTime = Date.now()
        
        // Create error entry
        const errorEntry: HarEntry = {
          _type: REQUEST_TYPE,
          startedDateTime: getISOTimestamp(requestData.startTime),
          time: getTimeDiff(requestData.startTime, requestData.endTime),
          request: {
            method: requestData.method,
            url: requestData.url,
            httpVersion: NOT_AVAILABLE,
            cookies: [],
            headers: headersToHar(requestData.headers),
            queryString: getHarQueryString(requestData.url),
            postData: createPostData(requestData),
            headersSize: -1,
            bodySize: -1,
          },
          response: {
            status: 0,
            statusText: error.message || 'Network Error',
            httpVersion: NOT_AVAILABLE,
            cookies: [],
            headers: [],
            content: { size: 0, mimeType: '', text: '' },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
          },
          cache: {},
          timings: {
            send: 0,
            wait: 0,
            receive: 0,
          },
        }

        config.onRequestFailure?.(errorEntry)
        
        // Re-throw the error to maintain original behavior
        throw error
      }
    )
  }

  // Return uninstall function
  return () => {
    window.fetch = originalFetch
  }
}
