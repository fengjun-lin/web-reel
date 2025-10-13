import { httpGet, httpPost } from './http'

import type {
  EnvStat,
  ResponseV,
  SessionLogPayload,
  UploadFlag,
  UploadFlagPayload,
  UserInfo,
} from '@/types'


/**
 * Upload PV (Page View) statistics
 * POST /api/pv
 */
export async function uploadPvStat(
  apiPrefix: string,
  pvStat: UserInfo
): Promise<ResponseV> {
  return httpPost(`${apiPrefix}/pv`, pvStat)
}

/**
 * Upload environment statistics
 * POST /api/env
 */
export async function uploadEnvStat(
  apiPrefix: string,
  envStat: EnvStat
): Promise<ResponseV> {
  return httpPost(`${apiPrefix}/env`, envStat)
}

/**
 * Get upload flag status
 * GET /api/get-flag?appId=xxx&deviceId=xxx
 */
export async function getUploadLogFlag(
  apiPrefix: string,
  userInfo: UserInfo
): Promise<ResponseV<{ uploadFlag: UploadFlag }>> {
  return httpGet<{ uploadFlag: UploadFlag }>(`${apiPrefix}/get-flag`, userInfo)
}

/**
 * Set upload flag
 * POST /api/set-flag
 */
export async function setUploadLogFlag(
  apiPrefix: string,
  setFlag: UploadFlagPayload
): Promise<ResponseV> {
  return httpPost(`${apiPrefix}/set-flag`, setFlag)
}

/**
 * Upload session logs
 * POST /api/upload-logs
 */
export async function uploadSessionLog(
  apiPrefix: string,
  data: SessionLogPayload
): Promise<ResponseV> {
  return httpPost(`${apiPrefix}/upload-logs`, data)
}

/**
 * HTTP API collection object (for legacy code style compatibility)
 */
export const httpApi = {
  getFlag: async (params: { appId: number; deviceId: string }) =>
    getUploadLogFlag('', params as UserInfo),
  setFlag: async (payload: { appId: number; deviceId: string; uploadFlag: number }) =>
    setUploadLogFlag('', payload as UploadFlagPayload),
}
