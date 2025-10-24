import JSZip from 'jszip';

import type { HarEntry } from './types/har';

export interface UploadOptions {
  endpoint: string;
  headers?: Record<string, string>;
  onProgress?: (_progress: number) => void;
  onSuccess?: (_response: any) => void;
  onError?: (_error: Error) => void;
  platform?: string;
  deviceId?: string;
  jiraId?: string;
}

export interface UploadResponse {
  success: boolean;
  session?: {
    id: number;
    created_at: string;
    jira_id?: string;
    platform?: string;
    device_id?: string;
  };
  error?: string;
}

/**
 * Upload session data to server as ZIP file
 * Compresses event and response data into a ZIP file and uploads via multipart/form-data
 */
export async function uploadSession(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] },
  options: UploadOptions,
): Promise<UploadResponse> {
  try {
    console.log('[Upload] Preparing session data for upload...');

    // Combine event data and response data by session
    const collection: { [key: string]: { eventData: any[]; responseData: HarEntry[] } } = {};

    Object.keys(eventDataMap).forEach((key) => {
      collection[key] = {
        eventData: eventDataMap[key] || [],
        responseData: responseDataMap[key] || [],
      };
    });

    console.log('[Upload] Converting to JSON...');

    let json: string;
    try {
      json = JSON.stringify(collection, null, 2);
      const sizeInMB = (new Blob([json]).size / 1024 / 1024).toFixed(2);
      console.log(`[Upload] JSON created (${sizeInMB} MB)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Upload] JSON.stringify failed:', errorMsg);
      throw new Error(`Failed to serialize session data: ${errorMsg}`);
    }

    console.log('[Upload] Compressing to ZIP...');

    // Create zip file
    const zip = new JSZip();
    zip.file('data.json', json);

    // Generate zip blob with progress tracking
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9, // Maximum compression
        },
      },
      (metadata) => {
        if (options.onProgress && metadata.percent) {
          // Report compression progress (0-50%)
          options.onProgress(metadata.percent / 2);
        }
      },
    );

    const zipSizeInMB = (zipBlob.size / 1024 / 1024).toFixed(2);
    const compressionRatio = ((1 - zipBlob.size / new Blob([json]).size) * 100).toFixed(1);
    console.log(`[Upload] ZIP created (${zipSizeInMB} MB, ${compressionRatio}% compression)`);

    // Validate file size (20MB max as per API spec)
    const maxSize = 20 * 1024 * 1024;
    if (zipBlob.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of 20MB (got ${zipSizeInMB}MB)`);
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', zipBlob, `record-${Date.now()}.zip`);

    // Add optional metadata fields
    if (options.platform) {
      formData.append('platform', options.platform);
    }
    if (options.deviceId) {
      formData.append('device_id', options.deviceId);
    }
    if (options.jiraId) {
      formData.append('jira_id', options.jiraId);
    }

    console.log(`[Upload] Uploading to ${options.endpoint}...`);

    // Upload to server with progress tracking using XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Setup upload progress tracking
    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Report upload progress (50-100%)
          const uploadProgress = 50 + (e.loaded / e.total) * 50;
          options.onProgress!(uploadProgress);
        }
      });
    }

    // Create promise for XHR
    const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as UploadResponse;
            resolve(response);
          } catch {
            // Fallback if response is not JSON
            resolve({ success: true });
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText) as UploadResponse;
            reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });
    });

    // Configure and send request
    xhr.open('POST', options.endpoint);

    // Set custom headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    // Set timeout to 5 minutes
    xhr.timeout = 5 * 60 * 1000;

    xhr.send(formData);

    // Wait for upload to complete
    const response = await uploadPromise;

    console.log('[Upload] Upload completed successfully:', response);

    if (options.onSuccess) {
      options.onSuccess(response);
    }

    return response;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error('[Upload] Upload failed:', errorObj);

    if (options.onError) {
      options.onError(errorObj);
    }

    throw errorObj;
  }
}
