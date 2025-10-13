// HAR (HTTP Archive) format type definitions
// Based on HAR 1.2 Spec: http://www.softwareishard.com/blog/har-12-spec/

export interface HarQueryString {
  name: string
  value: string
  comment?: string
}

export interface HarHeader {
  name: string
  value: string
  comment?: string
}

export interface HarPostData {
  mimeType: string
  params?: HarQueryString[]
  text?: string
  comment?: string
}

export interface HarRequest {
  method: string
  url: string
  httpVersion: string
  cookies: any[]
  headers: HarHeader[]
  queryString: HarQueryString[]
  postData?: HarPostData
  headersSize: number
  bodySize: number
  comment?: string
}

export interface HarContent {
  size: number
  mimeType: string
  text?: string
  encoding?: string
  comment?: string
}

export interface HarResponse {
  status: number
  statusText: string
  httpVersion: string
  cookies: any[]
  headers: HarHeader[]
  content: HarContent
  redirectURL: string
  headersSize: number
  bodySize: number
  comment?: string
}

export interface HarTimings {
  blocked?: number
  dns?: number
  connect?: number
  send: number
  wait: number
  receive: number
  ssl?: number
  comment?: string
}

export interface HarEntry {
  _type?: string // Custom field to distinguish XHR vs Fetch
  startedDateTime: string
  time: number
  request: HarRequest
  response: HarResponse
  cache: any
  timings: HarTimings
  serverIPAddress?: string
  connection?: string
  comment?: string
}
