// General constants

import { EAppId, LogLevel } from '../types'

// rrweb original attribute name for patching
export const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__'

// Log levels array
export const LOG_LEVELS: LogLevel[] = [
  'assert',
  'clear',
  'count',
  'countReset',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'trace',
  'warn',
]

// Log level color mapping
export const LEVEL_COLOR_MAP: Record<string, string> = {
  warn: '#fffbe5',
  error: '#fff0f0',
  info: 'rgba(20,133,238,0.2)',
}

// Application mapping
export const APP_MAP = new Map<EAppId, string>([
  [EAppId.KEFU, 'Customer Service Just'],
  [EAppId.PLAY_GROUND, 'Playground Demo Site'],
  [EAppId.TURING, 'Ticket System Turing'],
])

// Replayer search history localStorage key
export const REPLAYER_SEARCH_HISTORY = 'replayer_search_history'

// Maximum search history count
export const MAX_SEARCH_HISTORY_COUNT = 5
