import JSZip from 'jszip';

import type { HarEntry } from './types/har';

export interface RecordCollection {
  [traceTime: string]: {
    eventData: any[]; // rrweb eventWithTime[]
    responseData: HarEntry[];
  };
}

/**
 * Export session data to ZIP file (recommended)
 */
export async function exportToZip(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] },
): Promise<void> {
  try {
    // Combine event data and response data by session
    const collection: RecordCollection = {};

    Object.keys(eventDataMap).forEach((key) => {
      collection[key] = {
        eventData: eventDataMap[key] || [],
        responseData: responseDataMap[key] || [],
      };
    });

    console.log('[Export] Converting to JSON...');

    let json: string;
    try {
      json = JSON.stringify(collection, null, 2);
      const sizeInMB = (new Blob([json]).size / 1024 / 1024).toFixed(2);
      console.log(`[Export] ✓ JSON created (${sizeInMB} MB)`);
    } catch (error) {
      console.error('[Export] ❌ JSON.stringify failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }

    console.log('[Export] Compressing to ZIP...');

    // Create zip file
    const zip = new JSZip();
    zip.file('data.json', json);

    // Generate zip blob
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9, // Maximum compression
      },
    });

    const zipSizeInMB = (zipBlob.size / 1024 / 1024).toFixed(2);
    const compressionRatio = ((1 - zipBlob.size / new Blob([json]).size) * 100).toFixed(1);
    console.log(`[Export] ✓ ZIP created (${zipSizeInMB} MB, ${compressionRatio}% compression)`);

    // Create blob and download
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `record-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Export] ✅ Export completed');
  } catch (error) {
    console.error('[Export] ❌ Export failed:', error);
    throw error;
  }
}

/**
 * Export session data to JSON file (legacy support)
 */
export async function exportToJson(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] },
): Promise<void> {
  try {
    // Combine event data and response data by session
    const collection: RecordCollection = {};

    Object.keys(eventDataMap).forEach((key) => {
      collection[key] = {
        eventData: eventDataMap[key] || [],
        responseData: responseDataMap[key] || [],
      };
    });

    console.log('[Export] Converting to JSON...');

    let json: string;
    try {
      json = JSON.stringify(collection, null, 2);
      const sizeInMB = (new Blob([json]).size / 1024 / 1024).toFixed(2);
      console.log(`[Export] ✓ JSON created (${sizeInMB} MB)`);
    } catch (error) {
      console.error('[Export] ❌ JSON.stringify failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Create blob and download
    const blob = new Blob([json], {
      type: 'application/json;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `record-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Export] ✅ Export completed');
  } catch (error) {
    console.error('[Export] ❌ Export failed:', error);
    throw error;
  }
}

/**
 * Export session data to file (defaults to ZIP)
 * @param eventDataMap - Event data map
 * @param responseDataMap - Response data map
 * @param format - Export format ('zip' or 'json'), defaults to 'zip'
 */
export async function exportToFile(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] },
  format: 'zip' | 'json' = 'zip',
): Promise<void> {
  if (format === 'json') {
    return exportToJson(eventDataMap, responseDataMap);
  } else {
    return exportToZip(eventDataMap, responseDataMap);
  }
}
