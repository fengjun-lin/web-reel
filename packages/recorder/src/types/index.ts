// Type definitions for web-reel
/* eslint-disable no-unused-vars */

// Log levels
export type LogLevel =
  | 'assert'
  | 'clear'
  | 'count'
  | 'countReset'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'info'
  | 'log'
  | 'table'
  | 'time'
  | 'timeEnd'
  | 'timeLog'
  | 'trace'
  | 'warn'

// Console log data structure
export type LogData = {
  level: LogLevel
  trace: string[]
  payload: string[]
}

export type LogInfo = {
  level: LogLevel
  info: any[]
}

// Application IDs enum
export enum EAppId {
  KEFU = 4, // Customer service
  PLAY_GROUND = 5, // Playground
  TURING = 6, // Ticket system
}

// Error number types
export enum ErrNoType {
  SUCCESS = 0,
  PARAM_ERROR = 1,
  FAIL = 2,
  NO_RESOURCE = 3,
  UNEXPECTED_ERROR = 4,
  CONFLICT = 5,
}

// API response structure
export interface ResponseV<T = any> {
  errNo: number
  errStr: string
  data: T
}

// Session log interface
export interface ILog {
  appId?: EAppId
  beginTime?: number
  endTime?: number
  id?: number
  deviceId?: string
  sessionId?: number
  domData?: string
  networkData?: string
}

// Environment types
export enum Env {
  TEST = 'test',
  ONLINE = 'online',
}

// Recorder configuration
export interface RecorderOption {
  env: Env
  deviceId?: string
  appId: number
  projectName: string // Unique project identifier, required
  disabledDownLoad?: boolean // Whether to hide download button
  recordInterval?: number // Log retention duration in days, 0 for no history, -1 for unlimited
  enableStats?: boolean // Whether to enable PV and ENV statistics upload, default: false
}

// Upload flag types
export enum UploadFlag {
  OPEN = 1,
  CLOSE = 0,
}

// User info for API calls
export interface UserInfo {
  appId: number
  deviceId?: string
}

// Environment statistics
export interface EnvStat extends UserInfo {
  logSize: string
  ua: string
}

// Session log upload payload
export interface SessionLogPayload extends UserInfo {
  sessionId: number
  domData: string
  networkData: string
  beginTime: number
  endTime: number
}

// Upload flag payload
export interface UploadFlagPayload extends UserInfo {
  uploadFlag: UploadFlag
}
