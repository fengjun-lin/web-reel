import { Button, Space, Typography, message } from 'antd'
import JSZip from 'jszip'
import { useEffect, useRef, useState } from 'react'
import { record } from 'rrweb'
import { getRecordConsolePlugin } from 'rrweb/dist/plugins/console-record'
import type { eventWithTime } from 'rrweb/typings/types'
// @ts-ignore - rrweb 1.x console plugin

export default function ReportPage() {
  const [isRecording, setIsRecording] = useState(false)
  const stopRef = useRef<(() => void) | undefined>(undefined)
  const eventsRef = useRef<eventWithTime[]>([])

  useEffect(() => () => stopRef.current?.(), [])

  const start = () => {
    eventsRef.current = []
    try {
      const stop = record({
        emit: (e) => eventsRef.current.push(e),
        plugins: [
          getRecordConsolePlugin({
            level: ['error', 'warn', 'log', 'info'],
          }),
        ],
        maskAllInputs: true,
        recordCanvas: false,
        collectFonts: false,
      })
      stopRef.current = stop
      setIsRecording(true)
      message.info('Recording started')
    } catch (e) {
      console.error('Failed to start recording:', e)
      message.error(`Failed to start recording: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const stopAndDownload = async () => {
    stopRef.current?.()
    setIsRecording(false)

    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify({
      project: 'reel',
      createdAt: new Date().toISOString(),
      version: 'mvp',
    }, null, 2))
    zip.file('events.json', JSON.stringify(eventsRef.current))

    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reel-report-${Date.now()}.zip`
    a.click()
    message.success('Report downloaded')
  }

  return (
    <Space direction="vertical" size="large">
      <Typography.Title level={3}>Report</Typography.Title>
      <Space>
        {!isRecording
          ? <Button type="primary" onClick={start}>Start recording</Button>
          : <Button danger onClick={stopAndDownload}>Stop & Download</Button>}
      </Space>
      <Typography.Paragraph type="secondary">
        MVP: Uses rrweb to record DOM/interactions and console logs. Network summary and data masking can be added later.
      </Typography.Paragraph>
    </Space>
  )
}

