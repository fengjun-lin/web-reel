import { Button, Descriptions, Drawer, Empty, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { LEVEL_COLOR_MAP } from '@/constants'
import type { LogInfo } from '@/types'

import './styles.css'

const { Text } = Typography

interface ConsolePanelProps {
  logs: LogInfo[]
  autoScroll?: boolean
  currentTime?: number
  onSeekToTime?: (timestamp: number) => void
}

function LogItemContent({ item }: { item: any }) {
  const [showDetail, setShowDetail] = useState(false)

  if (typeof item === 'object') {
    const logInfo = JSON.stringify(item, null, 2)
    
    if (logInfo.length > 100) {
      return (
        <div style={{ paddingBottom: 4 }}>
          <Button
            size="small"
            type="link"
            onClick={() => setShowDetail(!showDetail)}
            style={{ padding: 0, height: 'auto' }}
          >
            {showDetail ? 'Collapse' : 'Expand'}
          </Button>
          {showDetail && <pre style={{ marginTop: 8 }}>{logInfo}</pre>}
        </div>
      )
    }
    
    return <pre>{logInfo}</pre>
  }

  const logInfo = String(item)
  
  if (logInfo.length > 100) {
    return (
      <div style={{ paddingBottom: 4 }}>
        <Button
          size="small"
          type="link"
          onClick={() => setShowDetail(!showDetail)}
          style={{ padding: 0, height: 'auto' }}
        >
          {showDetail ? 'Collapse' : 'Expand'}
        </Button>
        {showDetail ? (
          <pre style={{ marginTop: 8 }}>{logInfo}</pre>
        ) : (
          <span>{logInfo.slice(0, 100)}...</span>
        )}
      </div>
    )
  }

  return <span>{logInfo}</span>
}

interface LogItemProps {
  log: LogInfo
  highlight: boolean
  onSeekToTime?: (timestamp: number) => void
  onClick: () => void
}

function LogItem({ log, highlight, onSeekToTime, onClick }: LogItemProps) {
  const backgroundColor = LEVEL_COLOR_MAP[log.level] || '#fff'

  return (
    <div
      className={`console-log-item ${highlight ? 'console-log-item-highlight' : ''}`}
      style={{ backgroundColor, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="console-log-header">
        <span className="console-log-level">[{log.level.toUpperCase()}]</span>
        {log.timestamp && onSeekToTime && (
          <Button 
            type="link" 
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onSeekToTime(log.timestamp!)
            }}
            style={{ marginLeft: 'auto', padding: 0, height: 'auto' }}
          >
            Seek →
          </Button>
        )}
      </div>
      <div className="console-log-content">
        {Array.isArray(log.info) ? (
          log.info.map((item, index) => (
            <div key={index} style={{ marginBottom: 4 }}>
              <LogItemContent item={item} />
            </div>
          ))
        ) : (
          <LogItemContent item={log.info} />
        )}
      </div>
    </div>
  )
}

interface LogDetailProps {
  log: LogInfo | null
  visible: boolean
  onClose: () => void
}

function LogDetail({ log, visible, onClose }: LogDetailProps) {
  if (!log) return null

  return (
    <Drawer
      title="Console Log Details"
      width={720}
      placement="right"
      onClose={onClose}
      open={visible}
    >
      <div style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Level">
            <Text strong style={{ color: log.level === 'error' ? '#ff4d4f' : log.level === 'warn' ? '#faad14' : undefined }}>
              {log.level.toUpperCase()}
            </Text>
          </Descriptions.Item>
          {log.timestamp && (
            <Descriptions.Item label="Timestamp">
              {new Date(log.timestamp).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      <div>
        <Typography.Title level={5}>Content</Typography.Title>
        <div style={{ 
          padding: 12, 
          background: '#fafafa', 
          borderRadius: 4, 
          border: '1px solid #f0f0f0',
          maxHeight: 600,
          overflow: 'auto'
        }}>
          {Array.isArray(log.info) ? (
            log.info.map((item, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                </pre>
              </div>
            ))
          ) : (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {typeof log.info === 'object' ? JSON.stringify(log.info, null, 2) : String(log.info)}
            </pre>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default function ConsolePanel({ 
  logs, 
  autoScroll = true, 
  currentTime,
  onSeekToTime 
}: ConsolePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedLog, setSelectedLog] = useState<LogInfo | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  // Auto scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Check if a log should be highlighted based on current time
  const isHighlighted = (log: LogInfo) => {
    if (!currentTime || !log.timestamp) return false
    // Highlight logs within 1 second of current playback time
    return Math.abs(log.timestamp - currentTime) < 1000
  }

  const handleLogClick = (log: LogInfo) => {
    setSelectedLog(log)
    setDrawerVisible(true)
  }

  const handleDrawerClose = () => {
    setDrawerVisible(false)
  }

  return (
    <div className="console-panel">
      <div ref={containerRef} className="console-panel-content">
        {logs.length === 0 ? (
          <Empty
            description="No console logs recorded"
            style={{ marginTop: 40 }}
          />
        ) : (
          logs.map((log, index) => (
            <LogItem 
              key={index} 
              log={log} 
              highlight={isHighlighted(log)}
              onSeekToTime={onSeekToTime}
              onClick={() => handleLogClick(log)}
            />
          ))
        )}
      </div>

      <LogDetail
        log={selectedLog}
        visible={drawerVisible}
        onClose={handleDrawerClose}
      />
    </div>
  )
}
