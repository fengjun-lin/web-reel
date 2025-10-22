import { Button, Descriptions, Drawer, Empty, Pagination, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { LEVEL_COLOR_MAP } from '@/constants'
import type { LogInfo } from '@/types'

import './styles.css'

const { Text } = Typography
const PAGE_SIZE = 50 // Show 50 logs per page

interface ConsolePanelProps {
  logs: LogInfo[]
  autoScroll?: boolean
  currentTime?: number
  onSeekToTime?: (timestamp: number) => void
}

/**
 * Parse console format strings like '%c text' with CSS styles
 */
function parseFormattedLog(args: any[]): { text: string; styles?: React.CSSProperties }[] {
  if (!Array.isArray(args) || args.length === 0) {
    return [{ text: String(args) }]
  }

  const result: { text: string; styles?: React.CSSProperties }[] = []
  const firstArg = String(args[0])
  
  // Check if first argument contains %c (CSS style format)
  if (!firstArg.includes('%c')) {
    // No CSS formatting, just join all args
    const allText = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    return [{ text: allText }]
  }

  // Split by %c to get text segments
  const segments = firstArg.split('%c')
  let styleArgIndex = 1 // Start from args[1] for styles
  
  // First segment has no style
  if (segments[0]) {
    result.push({ text: segments[0] })
  }
  
  // Process remaining segments with styles
  for (let i = 1; i < segments.length; i++) {
    const text = segments[i]
    const styleArg = args[styleArgIndex]
    
    if (text) {
      if (styleArg && typeof styleArg === 'string') {
        const styles = parseCSSText(styleArg)
        result.push({ text, styles })
      } else {
        result.push({ text })
      }
    }
    
    styleArgIndex++
  }
  
  // Add remaining arguments (objects, etc.)
  for (let i = styleArgIndex; i < args.length; i++) {
    const arg = args[i]
    if (arg !== undefined && arg !== null) {
      const text = typeof arg === 'object' ? ' ' + JSON.stringify(arg, null, 2) : ' ' + String(arg)
      result.push({ text })
    }
  }

  return result
}

/**
 * Parse CSS text string to React CSSProperties
 */
function parseCSSText(cssText: string): React.CSSProperties {
  const styles: any = {}
  const declarations = cssText.split(';').map(d => d.trim()).filter(Boolean)
  
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim())
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      styles[camelProperty] = value
    }
  }
  
  return styles as React.CSSProperties
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

  // Parse formatted log content
  const formattedContent = Array.isArray(log.info) ? parseFormattedLog(log.info) : [{ text: String(log.info) }]

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
        {formattedContent.map((segment, index) => (
          <span key={index} style={segment.styles}>
            {segment.text}
          </span>
        ))}
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

  // Parse formatted log content for detail view
  const formattedContent = Array.isArray(log.info) ? parseFormattedLog(log.info) : [{ text: String(log.info) }]

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
          overflow: 'auto',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 14,
          lineHeight: 1.8
        }}>
          {formattedContent.map((segment, index) => (
            <span key={index} style={segment.styles}>
              {segment.text}
            </span>
          ))}
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
  const [currentPage, setCurrentPage] = useState(1)

  // Auto scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Check if a log should be highlighted based on current time
  const isHighlighted = (log: LogInfo) => {
    if (!currentTime || !log.timestamp) return false
    // Highlight logs within 2 seconds of current playback time
    const timeDiff = Math.abs(log.timestamp - currentTime)
    return timeDiff < 2000
  }

  const handleLogClick = (log: LogInfo) => {
    setSelectedLog(log)
    setDrawerVisible(true)
  }

  const handleDrawerClose = () => {
    setDrawerVisible(false)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }

  // Calculate paginated logs
  const totalLogs = logs.length
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const paginatedLogs = logs.slice(startIndex, endIndex)

  return (
    <div className="console-panel">
      {totalLogs > PAGE_SIZE && (
        <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={totalLogs}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total) => `Total ${total} logs`}
            size="small"
          />
        </div>
      )}
      
      <div ref={containerRef} className="console-panel-content">
        {logs.length === 0 ? (
          <Empty
            description="No console logs recorded"
            style={{ marginTop: 40 }}
          />
        ) : (
          paginatedLogs.map((log, index) => (
            <LogItem 
              key={startIndex + index} 
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
