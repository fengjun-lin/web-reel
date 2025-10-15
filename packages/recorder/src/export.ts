import JSZip from 'jszip'

import type { HarEntry } from './types/har'

export interface RecordCollection {
  [traceTime: string]: {
    eventData: any[] // rrweb eventWithTime[]
    responseData: HarEntry[]
  }
}

/**
 * Export session data to file
 */
export async function exportToFile(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] }
): Promise<void> {
  try {
    // Combine event data and response data by session
    const collection: RecordCollection = {}
    
    Object.keys(eventDataMap).forEach((key) => {
      collection[key] = {
        eventData: eventDataMap[key] || [],
        responseData: responseDataMap[key] || [],
      }
    })

    let json: string
    try {
      json = JSON.stringify(collection, null, 2)
    } catch (error) {
      console.error('[Export] Failed to stringify data:', error)
      json = '{}'
    }

    // Create blob and download
    const blob = new Blob([json], {
      type: 'application/json;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `record-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('[Export] Session data exported successfully')
  } catch (error) {
    console.error('[Export] Failed to export file:', error)
    throw error
  }
}

/**
 * Export session data as ZIP file
 */
export async function exportToZip(
  eventDataMap: { [traceTime: string]: any[] },
  responseDataMap: { [traceTime: string]: HarEntry[] }
): Promise<void> {
  try {
    const zip = new JSZip()

    // Add each session as separate files
    Object.keys(eventDataMap).forEach((sessionId) => {
      const sessionData = {
        eventData: eventDataMap[sessionId] || [],
        responseData: responseDataMap[sessionId] || [],
      }

      zip.file(`session-${sessionId}.json`, JSON.stringify(sessionData, null, 2))
    })

    // Generate ZIP file
    const content = await zip.generateAsync({ type: 'blob' })

    // Download
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = `records-${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('[Export] Session data exported as ZIP successfully')
  } catch (error) {
    console.error('[Export] Failed to export ZIP:', error)
    throw error
  }
}
