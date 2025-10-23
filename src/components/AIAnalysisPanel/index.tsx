/**
 * AI Analysis Panel Component
 * Displays AI-powered analysis of session errors and issues
 */

import { BulbOutlined, LoadingOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Space, Spin, Typography, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { isOpenAIConfigured } from '@/config/openai'
import { chatCompletion } from '@/services/openai'
import type { HarEntry } from '@/types/har'
import type { LogInfo } from '@/types'
import { buildAnalysisPrompt, prepareAnalysisData } from '@/utils/analysisHelper'

import './styles.css'

const { Title, Text, Paragraph } = Typography

interface AIAnalysisPanelProps {
  logs: LogInfo[]
  requests: HarEntry[]
  onOpenSettings?: () => void
  onSeekToTime?: (timestamp: number) => void
}

export default function AIAnalysisPanel({ logs, requests, onOpenSettings, onSeekToTime }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [streamingContent, setStreamingContent] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)

  const isConfigured = isOpenAIConfigured()

  // Handle seek link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#seek:')) {
        e.preventDefault()
        const href = target.getAttribute('href')
        if (href) {
          const timestamp = parseInt(href.replace('#seek:', ''), 10)
          if (!isNaN(timestamp) && onSeekToTime) {
            onSeekToTime(timestamp)
            message.success(`Seeking to ${target.textContent}`)
          }
        }
      }
    }

    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener('click', handleClick)
      return () => {
        contentElement.removeEventListener('click', handleClick)
      }
    }
  }, [onSeekToTime])

  const handleAnalyze = async (useStreaming = true) => {
    setAnalyzing(true)
    setError('')
    setAnalysis('') // Clear previous analysis
    setStreamingContent('') // Clear streaming content

    try {
      // Prepare data for analysis
      const data = prepareAnalysisData(logs, requests, {
        logLimit: 1000,
        requestLimit: 500,
        includeStackTrace: true,
      })

      // Check if there are any errors to analyze
      if (
        data.summary.errorCount === 0 &&
        data.summary.warningCount === 0 &&
        data.summary.networkErrorCount === 0
      ) {
        message.info('No errors or warnings found in this session. Everything looks good! ✅')
        setAnalyzing(false)
        return
      }

      // Build prompt
      const prompt = buildAnalysisPrompt(data)

      // Call OpenAI
      const result = await chatCompletion({
        messages: [
          {
            role: 'system',
            content:
              'You are an expert web developer and debugging assistant. Analyze session recordings to identify issues, their root causes, and provide actionable solutions. Be concise but thorough.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more focused analysis
        maxTokens: 2000,
        stream: useStreaming,
        onChunk: useStreaming
          ? (chunk) => {
              setStreamingContent((prev) => prev + chunk)
            }
          : undefined,
      })

      // Set final analysis result
      // In streaming mode, result.content contains the full text after streaming completes
      setAnalysis(result.content)
      
      // Clear streaming content after setting final analysis
      if (useStreaming) {
        setStreamingContent('')
      }

      if (result.usage) {
        console.log(
          `[AI Analysis] Tokens used: ${result.usage.totalTokens} (prompt: ${result.usage.promptTokens}, completion: ${result.usage.completionTokens})`
        )
      }

      message.success('Analysis completed!')
    } catch (err) {
      console.error('Analysis failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      message.error(`Analysis failed: ${errorMessage}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // Show configuration prompt if not configured
  if (!isConfigured) {
    return (
      <div className="ai-analysis-panel">
        <Empty
          image={<SettingOutlined style={{ fontSize: 64, color: '#999' }} />}
          description={
            <Space direction="vertical" size="small">
              <Text strong>OpenAI API Not Configured</Text>
              <Text type="secondary">
                To use AI-powered analysis, you need to configure your OpenAI API key.
              </Text>
            </Space>
          }
        >
          <Button type="primary" icon={<SettingOutlined />} onClick={onOpenSettings}>
            Configure OpenAI API
          </Button>
        </Empty>
      </div>
    )
  }

  // Show analysis UI
  return (
    <div className="ai-analysis-panel">
      {/* Action Bar - Always visible at top */}
      <div className="ai-analysis-header">
        <div style={{ flex: 1 }}>
          {!analysis && (
            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {logs.filter((l) => l.level === 'error').length} errors,{' '}
                {logs.filter((l) => l.level === 'warn').length} warnings,{' '}
                {requests.filter((r) => r.response.status >= 400).length} failed requests
              </Text>
            </Space>
          )}
        </div>
        
        <Space size="small">
          {analysis && (
            <Button 
              size="small" 
              icon={<BulbOutlined />}
              onClick={() => handleAnalyze(true)}
              disabled={analyzing}
            >
              Re-analyze
            </Button>
          )}
          {onOpenSettings && (
            <Button 
              size="small" 
              icon={<SettingOutlined />} 
              onClick={onOpenSettings}
            >
              Settings
            </Button>
          )}
        </Space>
      </div>

      {/* Scrollable Content Area */}
      <div className="ai-analysis-content-wrapper" ref={contentRef}>
        {/* No analysis yet - Show start button */}
        {!analyzing && !analysis && !error && (
          <div className="ai-analysis-empty">
            <Space direction="vertical" size="middle" style={{ textAlign: 'center' }}>
              <BulbOutlined style={{ fontSize: 64, color: '#1890ff', opacity: 0.6 }} />
              <div>
                <Text strong style={{ fontSize: 16 }}>AI Session Analysis</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Analyze errors and issues using AI
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={() => handleAnalyze(true)}
              >
                Start Analysis
              </Button>
            </Space>
          </div>
        )}

        {/* Loading State */}
        {analyzing && (
          <div className="ai-analysis-loading">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
                <div style={{ marginTop: 16 }}>
                  <Text strong>Analyzing...</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>This may take 10-30 seconds</Text>
                </div>
              </div>
              
              {/* Show streaming content while analyzing */}
              {streamingContent && streamingContent.length > 0 && (
                <div className="ai-analysis-content" style={{ marginTop: 16 }}>
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              )}
            </Space>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{ padding: 16 }}>
            <Alert
              type="error"
              message="Analysis Failed"
              description={
                <Space direction="vertical">
                  <Text>{error}</Text>
                  {error.includes('API key') && (
                    <Button size="small" type="link" onClick={onOpenSettings}>
                      Check API Configuration
                    </Button>
                  )}
                </Space>
              }
              showIcon
              closable
              onClose={() => setError('')}
            />
          </div>
        )}

        {/* Analysis Result - Scrollable */}
        {!analyzing && analysis && analysis.length > 0 && (
          <div className="ai-analysis-content">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

