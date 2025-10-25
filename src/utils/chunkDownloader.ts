/**
 * Chunk Downloader Utility
 *
 * Implements parallel chunked download with progress tracking and retry mechanism.
 * Supports HTTP Range requests for efficient large file downloads from Vercel Blob.
 */

export interface DownloadOptions {
  url: string;
  fileSize?: number; // Optional: if provided, skips HEAD request
  chunkSize?: number; // Default: 1MB
  maxConcurrent?: number; // Default: 6
  maxRetries?: number; // Default: 3
  onProgress?: (_progress: DownloadProgress) => void;
}

export interface DownloadProgress {
  loaded: number; // Bytes downloaded
  total: number; // Total bytes
  percentage: number; // Percentage 0-100
  speed: number; // Download speed in bytes/s
  remainingTime: number; // Estimated remaining time in seconds
  chunks: ChunkStatus[]; // Status of each chunk
}

export interface ChunkStatus {
  index: number;
  start: number;
  end: number;
  loaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

interface ChunkInfo {
  index: number;
  start: number;
  end: number;
}

// Default configuration
const DEFAULT_CONFIG = {
  chunkSize: 1024 * 1024, // 1MB per chunk
  maxConcurrent: 6, // Browser concurrent limit
  maxRetries: 3, // Max retries per chunk
  chunkThreshold: 1 * 1024 * 1024, // 1MB threshold for chunking
};

/**
 * Main download function with chunking support
 */
export async function downloadWithChunks(options: DownloadOptions): Promise<ArrayBuffer> {
  const {
    url,
    fileSize: providedFileSize,
    chunkSize = DEFAULT_CONFIG.chunkSize,
    maxConcurrent = DEFAULT_CONFIG.maxConcurrent,
    maxRetries = DEFAULT_CONFIG.maxRetries,
    onProgress,
  } = options;

  console.log('[Chunk Downloader] Starting download:', url);

  // Get file size (use provided or fetch via HEAD request)
  const fileSize = providedFileSize ?? (await getFileSize(url));
  console.log('[Chunk Downloader] File size:', formatBytes(fileSize));

  // Decide download strategy based on file size
  if (fileSize < DEFAULT_CONFIG.chunkThreshold) {
    console.log('[Chunk Downloader] File < 1MB, using direct download');
    return await downloadDirect(url, fileSize, onProgress);
  } else {
    console.log('[Chunk Downloader] File >= 1MB, using chunked download');
    return await downloadInChunks(url, fileSize, chunkSize, maxConcurrent, maxRetries, onProgress);
  }
}

/**
 * Get file size via HEAD request
 */
async function getFileSize(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      throw new Error('Unable to determine file size (no Content-Length header)');
    }

    return parseInt(contentLength, 10);
  } catch (error) {
    throw new Error(`Failed to get file size: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Direct download for small files
 */
async function downloadDirect(
  url: string,
  fileSize: number,
  onProgress?: (_progress: DownloadProgress) => void,
): Promise<ArrayBuffer> {
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if we can track progress with ReadableStream
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Report progress
        if (onProgress) {
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          const speed = loaded / elapsed;
          const remaining = (fileSize - loaded) / speed;

          onProgress({
            loaded,
            total: fileSize,
            percentage: (loaded / fileSize) * 100,
            speed,
            remainingTime: remaining,
            chunks: [
              {
                index: 0,
                start: 0,
                end: fileSize - 1,
                loaded,
                status: 'downloading',
              },
            ],
          });
        }
      }

      // Concatenate chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result.buffer;
    } else {
      // Fallback: direct arrayBuffer (no progress tracking)
      return await response.arrayBuffer();
    }
  } catch (error) {
    throw new Error(`Direct download failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Chunked download for large files
 */
async function downloadInChunks(
  url: string,
  fileSize: number,
  chunkSize: number,
  maxConcurrent: number,
  maxRetries: number,
  onProgress?: (_progress: DownloadProgress) => void,
): Promise<ArrayBuffer> {
  // Calculate chunks
  const chunks: ChunkInfo[] = [];
  for (let start = 0; start < fileSize; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, fileSize - 1);
    chunks.push({
      index: chunks.length,
      start,
      end,
    });
  }

  console.log(`[Chunk Downloader] Split into ${chunks.length} chunks of ~${formatBytes(chunkSize)}`);

  // Initialize chunk status tracking
  const chunkStatuses: ChunkStatus[] = chunks.map((chunk) => ({
    index: chunk.index,
    start: chunk.start,
    end: chunk.end,
    loaded: 0,
    status: 'pending',
  }));

  // Progress tracking
  const startTime = Date.now();
  let totalLoaded = 0;

  const updateProgress = () => {
    if (!onProgress) return;

    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const speed = totalLoaded / elapsed;
    const remaining = (fileSize - totalLoaded) / speed;

    onProgress({
      loaded: totalLoaded,
      total: fileSize,
      percentage: (totalLoaded / fileSize) * 100,
      speed,
      remainingTime: remaining > 0 ? remaining : 0,
      chunks: [...chunkStatuses],
    });
  };

  // Download chunks with concurrency control
  const results = await downloadChunksWithConcurrency(chunks, maxConcurrent, maxRetries, url, (index, loaded) => {
    chunkStatuses[index].loaded = loaded;
    chunkStatuses[index].status = loaded === chunks[index].end - chunks[index].start + 1 ? 'completed' : 'downloading';
    totalLoaded = chunkStatuses.reduce((sum, chunk) => sum + chunk.loaded, 0);
    updateProgress();
  });

  // Merge chunks
  console.log('[Chunk Downloader] Merging chunks...');
  const mergedBuffer = mergeChunks(results, fileSize);
  console.log('[Chunk Downloader] Download complete:', formatBytes(mergedBuffer.byteLength));

  return mergedBuffer;
}

/**
 * Download chunks with concurrency control
 */
async function downloadChunksWithConcurrency(
  chunks: ChunkInfo[],
  maxConcurrent: number,
  maxRetries: number,
  url: string,
  onChunkProgress: (_index: number, _loaded: number) => void,
): Promise<ArrayBuffer[]> {
  const results: ArrayBuffer[] = new Array(chunks.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const downloadTask = (async () => {
      try {
        const buffer = await downloadChunkWithRetry(url, chunk.start, chunk.end, maxRetries, (loaded) => {
          onChunkProgress(chunk.index, loaded);
        });
        results[chunk.index] = buffer;
        console.log(`[Chunk Downloader] Chunk ${chunk.index + 1}/${chunks.length} completed`);
      } catch (error) {
        throw new Error(`Chunk ${chunk.index} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    executing.push(downloadTask);

    // Control concurrency
    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
      // Remove completed promises
      const stillExecuting = executing.filter((p) => {
        let isResolved = false;
        p.then(() => {
          isResolved = true;
        }).catch(() => {
          isResolved = true;
        });
        return !isResolved;
      });
      executing.length = 0;
      executing.push(...stillExecuting);
    }
  }

  // Wait for all remaining downloads
  await Promise.all(executing);

  return results;
}

/**
 * Download a single chunk with retry mechanism
 */
async function downloadChunkWithRetry(
  url: string,
  start: number,
  end: number,
  maxRetries: number,
  onProgress: (_loaded: number) => void,
): Promise<ArrayBuffer> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Range: `bytes=${start}-${end}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if server returned partial content
      if (response.status !== 206) {
        console.warn(`[Chunk Downloader] Expected 206 Partial Content, got ${response.status}`);
      }

      // Download with progress tracking if possible
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          loaded += value.length;
          onProgress(loaded);
        }

        // Concatenate chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result.buffer;
      } else {
        // Fallback
        const buffer = await response.arrayBuffer();
        onProgress(buffer.byteLength);
        return buffer;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Chunk Downloader] Retry ${attempt + 1}/${maxRetries} for bytes ${start}-${end} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to download chunk ${start}-${end} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
  );
}

/**
 * Merge chunk buffers into a single ArrayBuffer
 */
function mergeChunks(chunks: ArrayBuffer[], totalSize: number): ArrayBuffer {
  const result = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    const chunkArray = new Uint8Array(chunk);
    result.set(chunkArray, offset);
    offset += chunkArray.length;
  }

  return result.buffer;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
