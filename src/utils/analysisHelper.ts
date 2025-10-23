/**
 * Analysis Helper Utilities
 * Prepares session data for AI analysis
 */

import type { LogInfo } from '@/types';
import type { HarEntry } from '@/types/har';

export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  context?: string;
}

export interface NetworkErrorInfo {
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
}

export interface AnalysisData {
  errors: ErrorInfo[];
  warnings: ErrorInfo[];
  networkErrors: NetworkErrorInfo[];
  timeline: string;
  sessionStartTime: number; // Add session start time for relative time calculation
  summary: {
    totalLogs: number;
    totalRequests: number;
    errorCount: number;
    warningCount: number;
    networkErrorCount: number;
  };
}

/**
 * Prepare session data for AI analysis
 * Only includes last N items to save tokens and focus on recent issues
 */
export function prepareAnalysisData(
  logs: LogInfo[],
  requests: HarEntry[],
  options: {
    logLimit?: number;
    requestLimit?: number;
    includeStackTrace?: boolean;
  } = {},
): AnalysisData {
  const { logLimit = 1000, requestLimit = 500, includeStackTrace = true } = options;

  // Extract all errors and warnings (don't limit these - they're most important)
  const errors: ErrorInfo[] = [];
  const warnings: ErrorInfo[] = [];

  // Get recent logs for context (prioritize recent data)
  const recentLogs = logs.slice(-logLimit);

  recentLogs.forEach((log) => {
    const info = {
      message: formatLogMessage(log.info),
      timestamp: log.timestamp || 0,
      stack: includeStackTrace ? extractStackTrace(log.info) : undefined,
    };

    if (log.level === 'error') {
      errors.push(info);
    } else if (log.level === 'warn') {
      warnings.push(info);
    }
  });

  // Sort errors and warnings by timestamp (newest first)
  errors.sort((a, b) => b.timestamp - a.timestamp);
  warnings.sort((a, b) => b.timestamp - a.timestamp);

  // Extract network errors (4xx, 5xx) - prioritize recent requests
  const recentRequests = requests.slice(-requestLimit);
  const networkErrors: NetworkErrorInfo[] = recentRequests
    .filter((entry) => entry.response.status >= 400)
    .map((entry) => ({
      url: entry.request.url,
      method: entry.request.method,
      status: entry.response.status,
      statusText: entry.response.statusText,
      requestHeaders: headersToObject(entry.request.headers),
      responseHeaders: headersToObject(entry.response.headers),
      requestBody: entry.request.postData?.text ? truncateText(entry.request.postData.text, 500) : undefined,
      responseBody: entry.response.content?.text ? truncateText(entry.response.content.text, 500) : undefined,
      timestamp: Date.parse(entry.startedDateTime),
    }))
    // Sort by timestamp (newest first)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Generate timeline summary
  const timeline = generateTimeline(recentLogs, recentRequests);

  // Get session start time (earliest timestamp from logs)
  const sessionStartTime = Math.min(
    ...[
      ...logs.filter((l) => l.timestamp).map((l) => l.timestamp!),
      ...requests.map((r) => Date.parse(r.startedDateTime)),
    ].filter((t) => t > 0),
  );

  return {
    errors,
    warnings,
    networkErrors,
    timeline,
    sessionStartTime,
    summary: {
      totalLogs: logs.length,
      totalRequests: requests.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      networkErrorCount: networkErrors.length,
    },
  };
}

/**
 * Format log message from info array
 */
function formatLogMessage(info: any[]): string {
  if (!Array.isArray(info)) {
    return String(info);
  }

  return info
    .map((item) => {
      if (typeof item === 'object') {
        try {
          return JSON.stringify(item, null, 2);
        } catch {
          return String(item);
        }
      }
      return String(item);
    })
    .join(' ')
    .slice(0, 1000); // Limit message length
}

/**
 * Extract stack trace from log info
 */
function extractStackTrace(info: any[]): string | undefined {
  if (!Array.isArray(info)) return undefined;

  // Look for Error objects or stack traces in the log
  for (const item of info) {
    if (item instanceof Error && item.stack) {
      return item.stack.split('\n').slice(0, 15).join('\n'); // Limit to 15 lines
    }
    if (typeof item === 'string' && item.includes('    at ')) {
      // Looks like a stack trace
      return item.split('\n').slice(0, 15).join('\n');
    }
  }

  return undefined;
}

/**
 * Convert headers array to object
 */
function headersToObject(headers: Array<{ name: string; value: string }>): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header) => {
    obj[header.name] = header.value;
  });
  return obj;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '... (truncated)';
}

/**
 * Generate a timeline summary of events
 */
function generateTimeline(logs: LogInfo[], requests: HarEntry[]): string {
  interface TimelineEvent {
    timestamp: number;
    type: 'log' | 'request';
    description: string;
  }

  const events: TimelineEvent[] = [];

  // Add significant logs (errors, warnings)
  logs
    .filter((log) => log.level === 'error' || log.level === 'warn')
    .forEach((log) => {
      if (log.timestamp && log.timestamp > 0) {
        events.push({
          timestamp: log.timestamp,
          type: 'log',
          description: `[${log.level.toUpperCase()}] ${formatLogMessage(log.info).slice(0, 100)}`,
        });
      }
    });

  // Add network errors
  requests
    .filter((entry) => entry.response.status >= 400)
    .forEach((entry) => {
      events.push({
        timestamp: Date.parse(entry.startedDateTime),
        type: 'request',
        description: `[${entry.response.status}] ${entry.request.method} ${entry.request.url}`,
      });
    });

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  // Format timeline
  if (events.length === 0) {
    return 'No significant events found.';
  }

  const startTime = events[0]!.timestamp;
  return events
    .slice(0, 50) // Limit to 50 events
    .map((event) => {
      const relativeTime = ((event.timestamp - startTime) / 1000).toFixed(2);
      return `[+${relativeTime}s] ${event.description}`;
    })
    .join('\n');
}

/**
 * Format relative time from session start
 */
function formatRelativeTime(timestamp: number, sessionStartTime: number): string {
  const offsetMs = timestamp - sessionStartTime;
  const offsetSeconds = Math.floor(offsetMs / 1000);
  const minutes = Math.floor(offsetSeconds / 60);
  const seconds = offsetSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Build AI analysis prompt from prepared data
 */
export function buildAnalysisPrompt(data: AnalysisData): string {
  const sections: string[] = [];

  // Summary
  sections.push(`# Session Analysis Request

## Session Summary
- Total Logs: ${data.summary.totalLogs}
- Total Network Requests: ${data.summary.totalRequests}
- Console Errors: ${data.summary.errorCount}
- Console Warnings: ${data.summary.warningCount}
- Network Errors (4xx/5xx): ${data.summary.networkErrorCount}
`);

  // Console Errors (already sorted newest first)
  if (data.errors.length > 0) {
    sections.push(`## Console Errors (${data.errors.length} total, showing most recent first)`);

    // Show top 10 most recent errors
    const topErrors = data.errors.slice(0, 10);
    topErrors.forEach((error, index) => {
      const timestamp = new Date(error.timestamp);
      const relativeTime = formatRelativeTime(error.timestamp, data.sessionStartTime);
      const timeStr = timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      sections.push(`
### Error ${index + 1} ${index === 0 ? '⚠️ (Most Recent)' : ''}

**🎯 Player Time:** [${relativeTime}](#seek:${error.timestamp}) *(click to seek)*

**Message:** ${error.message}

**Occurred At:** ${timeStr}

**Timestamp (for reference):** ${error.timestamp}ms${
        error.stack ? `\n\n**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`` : ''
      }`);
    });

    if (data.errors.length > 10) {
      sections.push(`\n_... and ${data.errors.length - 10} more errors (older)_`);
    }
  }

  // Console Warnings (already sorted newest first)
  if (data.warnings.length > 0) {
    sections.push(`\n## Console Warnings (${data.warnings.length} total, showing most recent)`);

    // Show top 5 most recent warnings
    const topWarnings = data.warnings.slice(0, 5);
    topWarnings.forEach((warning, index) => {
      const relativeTime = formatRelativeTime(warning.timestamp, data.sessionStartTime);
      sections.push(
        `${index + 1}. [${relativeTime}](#seek:${warning.timestamp}) - ${warning.message.slice(0, 180)}${warning.message.length > 180 ? '...' : ''}`,
      );
    });

    if (data.warnings.length > 5) {
      sections.push(`\n_... and ${data.warnings.length - 5} more warnings (older)_`);
    }
  }

  // Network Errors (already sorted newest first)
  if (data.networkErrors.length > 0) {
    sections.push(`\n## Network Errors (${data.networkErrors.length} total, showing most recent first)`);

    // Show all network errors (they're usually important)
    data.networkErrors.forEach((error, index) => {
      const timestamp = new Date(error.timestamp);
      const relativeTime = formatRelativeTime(error.timestamp, data.sessionStartTime);
      const timeStr = timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      sections.push(`
### Request ${index + 1} ${index === 0 ? '⚠️ (Most Recent)' : ''}

**🎯 Player Time:** [${relativeTime}](#seek:${error.timestamp}) *(click to seek)*

**URL:** ${error.url}

**Method:** ${error.method} | **Status:** ${error.status} ${error.statusText}

**Occurred At:** ${timeStr}

**Timestamp (for reference):** ${error.timestamp}ms${
        error.responseBody ? `\n\n**Response Body:**\n\`\`\`\n${error.responseBody}\n\`\`\`` : ''
      }`);
    });
  }

  // Timeline
  sections.push(`\n## Event Timeline\n\`\`\`\n${data.timeline}\n\`\`\``);

  // Analysis request
  sections.push(`\n## Analysis Request

**Important Context**: 
- Errors and network failures are sorted by **most recent first** (newest → oldest)
- The **most recent errors** (marked with ⚠️) are likely the **most relevant** to the user's issue
- **Each error includes a timestamp** - use this to understand the sequence of events
- Focus your analysis on the **most recent problems** as they represent the current state

**CRITICAL - Timestamp Format Instructions**:
When referencing specific errors in your analysis, you MUST use this exact format for timestamps:
- Format: "Error at [HH:MM:SS](#seek:TIMESTAMP_IN_MS) 🎯"
- Example: "Error at [13:03:17](#seek:1729678997000) 🎯"
- The timestamp should link to the exact millisecond timestamp using the #seek: format
- Always include the 🎯 emoji after seekable timestamps
- Extract the exact timestamp from the "Occurred At" field and convert to milliseconds

Please analyze this session data and provide:

1. **Root Cause Analysis**: 
   - What is the most likely root cause of the **most recent issues**? 
   - **Use clickable timestamp links** when discussing specific errors (e.g., "The error at [13:45:23](#seek:1729679123000) 🎯...")
   - Focus on the primary error or failure point that occurred most recently

2. **Error Correlation**: 
   - Are the recent errors related to each other? 
   - What is the chain of causation? Did earlier errors lead to later ones?
   - **Use clickable timestamps to show the sequence** (e.g., "Error A at [13:45:20](#seek:1729679120000) 🎯 likely caused Error B at [13:45:23](#seek:1729679123000) 🎯")

3. **Impact Assessment**: 
   - Which errors are critical (block user workflow)?
   - Which are warnings or minor issues?
   - What functionality is affected?
   - **Use clickable timestamp links for critical errors**

4. **Fix Suggestions**: Provide concrete, actionable steps to fix the issues:
   - Code changes needed
   - Configuration adjustments
   - API fixes
   - **Focus on fixes for the most recent problems**
   - **Include clickable timestamps when referencing which error needs fixing**
   
5. **Prevention**: How can we prevent similar issues in the future?
   - Code improvements
   - Better error handling
   - Monitoring/alerts

Format your response in clear markdown with sections. **IMPORTANT: When referencing specific errors, always use clickable timestamp links in the format [HH:MM:SS](#seek:timestamp) 🎯** for clarity and to allow users to jump to that exact moment in the replay. Focus on being practical and actionable for developers.`);

  return sections.join('\n');
}
