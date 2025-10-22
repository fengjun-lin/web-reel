import { InboxOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Space, Tabs, Typography, Upload, message } from 'antd'
import type { UploadProps } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { eventWithTime } from 'rrweb/typings/types'
import rrwebPlayer from 'rrweb-player'
import 'rrweb-player/dist/style.css'

import ConsolePanel from '@/components/ConsolePanel'
import NetworkPanel from '@/components/NetworkPanel'
import type { RecordCollection } from '@/recorder'
import type { LogInfo } from '@/types'
import type { HarEntry } from '@/types/har'

const { Title, Text } = Typography
const { Dragger } = Upload

interface SessionData {
  eventData: eventWithTime[]
  responseData: HarEntry[]
}

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<rrwebPlayer | null>(null)
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [hasError, setHasError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [consoleLogs, setConsoleLogs] = useState<LogInfo[]>([])

  // Load session from sessionStorage on mount
  useEffect(() => {
    if (id) {
      loadSessionById(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadSessionById = (id: string) => {
    try {
      setLoading(true)
      const sessionsJson = sessionStorage.getItem('uploadedSessions')
      
      if (!sessionsJson) {
        message.error('No sessions found. Please upload a session file first.')
        setLoading(false)
        return
      }

      const sessions: RecordCollection = JSON.parse(sessionsJson)
      const session = sessions[id]

      if (!session) {
        message.error(`Session ${id} not found`)
        setLoading(false)
        return
      }

      const eventData = session.eventData || []
      
      setSessionData({
        eventData,
        responseData: session.responseData || [],
      })
      
      // Extract console logs from events
      extractConsoleLogs(eventData)
      
      setHasError(false)
      message.success(`Session ${id} loaded successfully`)
    } catch (error) {
      console.error('Failed to load session:', error)
      message.error(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      setLoading(true)

      // Read file as text
      const reader = new FileReader()
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })

      const collection: RecordCollection = JSON.parse(content)
      const sessionIds = Object.keys(collection)

      if (sessionIds.length === 0) {
        message.error('No sessions found in file')
        setLoading(false)
        return false
      }

      // Load the most recent session
      const latestSessionId = sessionIds.sort((a, b) => parseInt(b, 10) - parseInt(a, 10))[0]
      
      if (!latestSessionId) {
        message.error('No valid session ID found')
        setLoading(false)
        return false
      }
      
      const session = collection[latestSessionId]

      if (!session) {
        message.error('Failed to parse session data')
        setLoading(false)
        return false
      }

      const eventData = session.eventData || []
      
      setSessionData({
        eventData,
        responseData: session.responseData || [],
      })

      // Extract console logs from events
      extractConsoleLogs(eventData)

      setHasError(false)
      message.success(`Loaded session ${latestSessionId}`)
    } catch (error) {
      console.error('Failed to parse file:', error)
      message.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setHasError(true)
    } finally {
      setLoading(false)
    }

    return false
  }

  // Initialize rrweb player when session data is available
  useEffect(() => {
    if (!sessionData || sessionData.eventData.length === 0) {
      return
    }

    if (!containerRef.current) {
      console.warn('[Replay] Container ref not ready')
      return
    }

    // Validate event data
    const hasFullSnapshot = sessionData.eventData.some((event) => event.type === 2)
    if (!hasFullSnapshot) {
      console.error('[Replay] No full snapshot found in events')
      message.error('Invalid recording: missing initial snapshot')
      setHasError(true)
      return
    }

    // Set up error suppression BEFORE any initialization
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    console.error = (...args: any[]) => {
      const msg = String(args[0] || '')
      const errorObj = args[0]
      
      // Get stack trace to identify error source
      let stack = ''
      if (errorObj instanceof Error) {
        stack = errorObj.stack || ''
      } else if (args[1] instanceof Error) {
        stack = args[1].stack || ''
      } else {
        // Try to get stack from Error object
        try {
          throw new Error()
        } catch (e: any) {
          stack = e.stack || ''
        }
      }
      
      // Only suppress errors that are DEFINITELY from rrweb-player or browser extensions
      const isRrwebError = stack.includes('rrweb-player.js') || stack.includes('rrweb-player.esm')
      const isExtensionError = stack.includes('apps.common.index') || stack.includes('chrome-extension://')
      
      if (isRrwebError || isExtensionError) {
        // Only suppress known non-fatal rrweb errors
        if (
          msg.includes('CssSyntaxError') ||
          msg.includes('Unclosed bracket') ||
          msg.includes('Node with id') && isRrwebError ||
          msg.includes('prepend') && isExtensionError
        ) {
          // Silent ignore - these are known non-fatal issues
          return
        }
      }
      
      // All other errors should be logged normally
      originalConsoleError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const msg = String(args[0] || '')
      
      // Only suppress rrweb internal warnings
      if (
        (msg.includes('Node with id') || msg.includes('[replayer]')) &&
        (new Error().stack?.includes('rrweb-player') || false)
      ) {
        return
      }
      
      originalConsoleWarn.apply(console, args)
    }

    // Delay initialization to ensure DOM is fully ready
    const initTimer = setTimeout(() => {
      try {
        // Clean up previous player
        if (playerRef.current) {
          try {
            playerRef.current.pause()
          } catch {
            // Ignore pause errors
          }
          playerRef.current = null
        }

        // Ensure container still exists
        if (!containerRef.current) {
          console.debug('[Replay] Container disappeared during init')
          return
        }

        // Clear container safely
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }

        // Create new player with v1 correct structure
        try {
          const player = new rrwebPlayer({
            target: containerRef.current,
            // v1: UI config in props
            props: {
              events: sessionData.eventData,
              width: Math.max(containerRef.current.offsetWidth || 1200, 800),
              height: 600,
              autoPlay: false,
              speed: 1,
              showController: true,
              skipInactive: true,
              inactiveColor: '#D4D4D4', // Customize inactive periods color in progress bar
              // Enable console log replay
              replayLog: true,
            },
          } as any)

          playerRef.current = player

          // Setup replayer event listeners
          const replayer = player.getReplayer()
          if (replayer) {
            console.log('[Replay] Player initialized successfully')
          }

          // Listen to time updates
          try {
            if (replayer) {
              replayer.on('ui-update-current-time', (event: any) => {
                const timestamp = event as number
                setCurrentTime(timestamp)
              })

              // Enable interaction
              replayer.enableInteract()
            }
          } catch (error) {
            console.debug('[Replay] Failed to setup replayer events:', error)
          }
        } catch (error) {
          // Only log if it's not a CSS/DOM error
          const errorMsg = error instanceof Error ? error.message : String(error)
          if (
            !errorMsg.includes('CssSyntaxError') &&
            !errorMsg.includes('Unclosed bracket')
          ) {
            console.error('[Replay] Player initialization failed:', error)
            throw error
          }
          // CSS errors are non-fatal, player will work anyway
        }
      } catch (error) {
        console.error('[Replay] Initialization error:', error)
        message.error(`Replay failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setHasError(true)
      }
    }, 100) // Delay 100ms to ensure DOM is ready

    return () => {
      // Restore console functions
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      
      // Clean up timer and player
      clearTimeout(initTimer)
      if (playerRef.current) {
        try {
          playerRef.current.pause()
        } catch {
          // Ignore cleanup errors
        }
        playerRef.current = null
      }
    }
  }, [sessionData])

  const extractConsoleLogs = (events: eventWithTime[]) => {
    const logs: LogInfo[] = []
    
    // Extract console logs from rrweb events
    // rrweb records console logs as plugin events (type 6) with plugin name 'rrweb/console@1'
    events.forEach((event: any) => {
      if (event.type === 6 && event.data?.plugin === 'rrweb/console@1') {
        const payload = event.data.payload
        if (payload && payload.level) {
          logs.push({
            level: payload.level,
            info: payload.payload || [],
            timestamp: event.timestamp, // Store timestamp for timeline sync
          })
        }
      }
    })

    console.log('[Replay] Extracted', logs.length, 'console logs')
    setConsoleLogs(logs)
  }

  const handleSeekToTime = (timestamp: number) => {
    const player = playerRef.current
    if (player && sessionData) {
      try {
        // Calculate time offset from the start of the recording
        const startTime = sessionData.eventData[0]?.timestamp || 0
        const timeOffset = timestamp - startTime
        
        console.log('[Replay] Seeking to timestamp:', timestamp, 'start:', startTime, 'offset:', timeOffset, 'ms')
        
        // Use player.goto method which is the correct way to seek in rrweb-player
        player.goto(timeOffset, false) // false = pause after seeking
        setCurrentTime(timestamp)
      } catch (error) {
        console.error('[Replay] Failed to seek:', error)
        message.error('Failed to seek to the specified time')
      }
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Session Replay</Title>
          {id && (
            <Text type="secondary">Session ID: {id}</Text>
          )}
        </div>
        <Upload beforeUpload={handleUpload} accept=".json,.txt" showUploadList={false}>
          <Button type="primary" icon={<InboxOutlined />} loading={loading}>
            Upload Session File
          </Button>
        </Upload>
      </div>

      {hasError && (
        <Alert
          message="Replay Error"
          description="An error occurred during replay. The recording data may be incomplete or corrupted."
          type="error"
          closable
          onClose={() => setHasError(false)}
        />
      )}

      {!sessionData && !loading && (
        <Card>
          <Dragger
            beforeUpload={handleUpload}
            accept=".json,.txt"
            showUploadList={false}
            disabled={loading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to upload</p>
            <p className="ant-upload-hint">
              Upload a session file (JSON or TXT format) to start replay
            </p>
          </Dragger>
        </Card>
      )}

      {sessionData && (
        <>
          <Alert
            message="Replay Ready"
            description={`Loaded ${sessionData.eventData.length} events and ${sessionData.responseData.length} network requests. Use the player controls to navigate through the session.`}
            type="info"
            closable
          />

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Player Section */}
            <Card
              title="Session Player"
              extra={
                sessionData.eventData[0] && (
                  <Text type="secondary">
                    Start: {formatTime(sessionData.eventData[0].timestamp)}
                  </Text>
                )
              }
              style={{ flex: '0 0 60%', maxWidth: '60%' }}
            >
              <div
                ref={containerRef}
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  minHeight: 600,
                  maxHeight: 700,
                  backgroundColor: '#f5f5f5',
                  overflow: 'hidden',
                }}
              />
            </Card>

            {/* Panels Section */}
            <Card 
              title="Session Details" 
              style={{ 
                flex: '0 0 calc(40% - 16px)',
                maxWidth: 'calc(40% - 16px)',
                maxHeight: '750px'
              }}
              bodyStyle={{ 
                height: '680px',
                padding: 0,
                overflow: 'hidden'
              }}
            >
              <Tabs
                defaultActiveKey="logs"
                style={{ height: '100%' }}
                items={[
                  {
                    key: 'logs',
                    label: `Console (${consoleLogs.length})`,
                    children: (
                      <ConsolePanel 
                        logs={consoleLogs} 
                        currentTime={currentTime}
                        onSeekToTime={handleSeekToTime}
                      />
                    ),
                  },
                  {
                    key: 'network',
                    label: `Network (${sessionData.responseData.length})`,
                    children: (
                      <NetworkPanel 
                        requests={sessionData.responseData} 
                        currentTime={currentTime}
                        onSeekToTime={handleSeekToTime}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </>
      )}
    </Space>
  )
}

