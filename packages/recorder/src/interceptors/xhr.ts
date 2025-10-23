import type { HarContent, HarEntry, HarPostData, HarRequest, HarResponse } from '../types/har';
import { getHarQueryString, getISOTimestamp, getTimeDiff, NOT_AVAILABLE, objectHeadersToHar } from '../utils/harHelper';

const REQUEST_TYPE = 'xhr';

interface XhrRequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  startTime: number;
  endTime?: number;
}

interface XhrConfig {
  onRequest?: (_data: XhrRequestData) => void;
  onResponse?: (_entry: HarEntry) => void;
  onError?: (_entry: HarEntry) => void;
}

// Store original XMLHttpRequest methods (lazily initialized)
let OriginalXHR: typeof XMLHttpRequest | undefined;
let originalOpen: typeof XMLHttpRequest.prototype.open | undefined;
let originalSend: typeof XMLHttpRequest.prototype.send | undefined;
let originalSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader | undefined;

// Initialize only in browser environment
function ensureInitialized() {
  if (typeof window === 'undefined') return false;
  if (!OriginalXHR) {
    OriginalXHR = window.XMLHttpRequest;
    originalOpen = OriginalXHR.prototype.open;
    originalSend = OriginalXHR.prototype.send;
    originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;
  }
  return true;
}

/**
 * Create HAR entry from XHR data
 */
function createHarEntry(requestData: XhrRequestData, xhr: XMLHttpRequest, isError: boolean = false): HarEntry {
  const request: HarRequest = {
    method: requestData.method,
    url: requestData.url,
    httpVersion: NOT_AVAILABLE,
    cookies: [],
    headers: objectHeadersToHar(requestData.headers),
    queryString: getHarQueryString(requestData.url),
    postData: createPostData(requestData),
    headersSize: -1,
    bodySize: -1,
  };

  const response: HarResponse = {
    status: isError ? 0 : xhr.status,
    statusText: isError ? 'Network Error' : xhr.statusText,
    httpVersion: NOT_AVAILABLE,
    cookies: [],
    headers: isError ? [] : parseResponseHeaders(xhr.getAllResponseHeaders()),
    content: createResponseContent(xhr, isError),
    redirectURL: '',
    headersSize: -1,
    bodySize: -1,
  };

  const entry: HarEntry = {
    _type: REQUEST_TYPE,
    startedDateTime: getISOTimestamp(requestData.startTime),
    time: getTimeDiff(requestData.startTime, requestData.endTime || Date.now()),
    request,
    response,
    cache: {},
    timings: {
      send: 0,
      wait: 0,
      receive: 0,
    },
  };

  return entry;
}

/**
 * Create POST data for HAR format
 */
function createPostData(requestData: XhrRequestData): HarPostData | undefined {
  if (!requestData.body) {
    return undefined;
  }

  const text = typeof requestData.body === 'string' ? requestData.body : JSON.stringify(requestData.body);

  return {
    mimeType: requestData.headers['Content-Type'] || 'text/plain',
    params: [],
    text,
  };
}

/**
 * Create response content for HAR format
 */
function createResponseContent(xhr: XMLHttpRequest, isError: boolean): HarContent {
  if (isError) {
    return {
      size: 0,
      mimeType: '',
      text: '',
    };
  }

  const contentType = xhr.getResponseHeader('Content-Type') || '';
  const contentLength = xhr.getResponseHeader('Content-Length');
  const size = contentLength ? parseInt(contentLength, 10) : 0;

  let text = '';
  try {
    text = typeof xhr.response === 'string' ? xhr.response : xhr.responseText || '';
  } catch {
    // Response might not be available
  }

  return {
    size,
    mimeType: contentType,
    text,
  };
}

/**
 * Parse response headers string to HAR format
 */
function parseResponseHeaders(headersString: string) {
  const headers: Array<{ name: string; value: string }> = [];

  if (!headersString) {
    return headers;
  }

  const lines = headersString.trim().split(/[\r\n]+/);

  lines.forEach((line) => {
    const parts = line.split(': ');
    const name = parts.shift();
    const value = parts.join(': ');

    if (name) {
      headers.push({ name, value });
    }
  });

  return headers;
}

/**
 * Install XHR interceptor
 */
export function installXhrInterceptor(config: XhrConfig): () => void {
  // Skip in non-browser environment (e.g., SSR)
  if (!ensureInitialized()) {
    return () => {}; // Return no-op uninstall function
  }

  const requestDataMap = new WeakMap<XMLHttpRequest, XhrRequestData>();

  // Override open method
  OriginalXHR!.prototype.open = function (method: string, url: string, ...args: any[]) {
    const requestData: XhrRequestData = {
      method: method.toUpperCase(),
      url,
      headers: {},
      startTime: Date.now(),
    };

    requestDataMap.set(this, requestData);
    return originalOpen!.apply(this, [method, url, ...args] as any);
  };

  // Override setRequestHeader method
  OriginalXHR!.prototype.setRequestHeader = function (name: string, value: string) {
    const requestData = requestDataMap.get(this);
    if (requestData) {
      requestData.headers[name] = value;
    }
    return originalSetRequestHeader!.apply(this, [name, value]);
  };

  // Override send method
  OriginalXHR!.prototype.send = function (body?: any) {
    const xhr = this;
    const requestData = requestDataMap.get(xhr);

    if (requestData) {
      requestData.body = body;
      requestData.startTime = Date.now();

      // Call onRequest hook
      config.onRequest?.(requestData);

      // Add event listeners for response
      const onLoad = () => {
        requestData.endTime = Date.now();
        const entry = createHarEntry(requestData, xhr, false);
        config.onResponse?.(entry);
      };

      const onError = () => {
        requestData.endTime = Date.now();
        const entry = createHarEntry(requestData, xhr, true);
        config.onError?.(entry);
      };

      xhr.addEventListener('load', onLoad);
      xhr.addEventListener('error', onError);
      xhr.addEventListener('abort', onError);
      xhr.addEventListener('timeout', onError);
    }

    return originalSend!.apply(xhr, [body]);
  };

  // Return uninstall function
  return () => {
    OriginalXHR!.prototype.open = originalOpen!;
    OriginalXHR!.prototype.send = originalSend!;
    OriginalXHR!.prototype.setRequestHeader = originalSetRequestHeader!;
  };
}
