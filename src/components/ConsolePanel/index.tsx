import { Button, Empty, Radio, Space } from 'antd'
import { useEffect, useRef, useState } from 'react'

import { LEVEL_COLOR_MAP, LOG_LEVELS } from '@/constants'
import type { LogInfo, LogLevel } from '@/types'

import './styles.css'

interface ConsolePanelProps {
  logs: LogInfo[]
  autoScroll?: boolean
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

function LogItem({ log }: { log: LogInfo }) {
  const backgroundColor = LEVEL_COLOR_MAP[log.level] || '#fff'

  return (
    <div
      className="console-log-item"
      style={{ backgroundColor }}
    >
      <div className="console-log-header">
        <span className="console-log-level">[{log.level.toUpperCase()}]</span>
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

export default function ConsolePanel({ logs, autoScroll = true }: ConsolePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')

  // Auto scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter)

  return (
    <div className="console-panel">
      <div className="console-panel-header">
        <Space>
          <span>Filter:</span>
          <Radio.Group
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            size="small"
          >
            <Radio.Button value="all">All ({logs.length})</Radio.Button>
            {LOG_LEVELS.map((level) => {
              const count = logs.filter(log => log.level === level).length
              return (
                <Radio.Button key={level} value={level}>
                  {level} ({count})
                </Radio.Button>
              )
            })}
          </Radio.Group>
        </Space>
      </div>

      <div ref={containerRef} className="console-panel-content">
        {filteredLogs.length === 0 ? (
          <Empty
            description="No console logs recorded"
            style={{ marginTop: 40 }}
          />
        ) : (
          filteredLogs.map((log, index) => (
            <LogItem key={index} log={log} />
          ))
        )}
      </div>
    </div>
  )
}
