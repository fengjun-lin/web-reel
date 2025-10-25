'use client';

import { InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Modal, Progress, Space, Tabs, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import JSZip from 'jszip';
import { useEffect, useRef, useState } from 'react';
import type { eventWithTime } from 'rrweb/typings/types';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import ConsolePanel from '@/components/ConsolePanel';
import CreateJiraModal from '@/components/CreateJiraModal';
import NetworkPanel from '@/components/NetworkPanel';
import OpenAISettings from '@/components/OpenAISettings';
import type { RecordCollection } from '@/recorder';
import type { LogInfo } from '@/types';
import type { HarEntry } from '@/types/har';
import { downloadWithChunks, type DownloadProgress } from '@/utils/chunkDownloader';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface SessionData {
  eventData: eventWithTime[];
  responseData: HarEntry[];
}

interface ReplayerContentProps {
  sessionId?: string;
}

export default function ReplayerContent({ sessionId }: ReplayerContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | null>(null);

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<LogInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [urlHistory, setUrlHistory] = useState<Array<{ url: string; timestamp: number; trigger: string }>>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Load session from sessionStorage on mount (only if sessionId is provided)
  useEffect(() => {
    if (sessionId) {
      loadSessionById(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadSessionById = async (id: string) => {
    try {
      setLoading(true);
      setShowProgress(true); // Show progress immediately

      // Fetch session metadata from API
      const response = await fetch(`/api/sessions/${id}`);
      const data = await response.json();

      if (!data.success || !data.session) {
        message.error('Session not found');
        setLoading(false);
        setShowProgress(false);
        setDownloadProgress(null);
        return;
      }

      // Record start time when download actually begins
      let progressStartTime: number | null = null;

      // Download ZIP file from Vercel Blob using chunked downloader
      const blobBuffer = await downloadWithChunks({
        url: data.session.blob_url,
        fileSize: data.session.file_size,
        onProgress: (progress) => {
          // Record the first time progress is shown
          if (progressStartTime === null) {
            progressStartTime = Date.now();
          }
          setDownloadProgress(progress);
        },
      });

      // Ensure progress bar displays for at least 1.5 seconds from when it first showed
      if (progressStartTime !== null) {
        const elapsed = Date.now() - progressStartTime;
        const minDisplayTime = 1500; // 1.5 seconds
        if (elapsed < minDisplayTime) {
          await new Promise((resolve) => setTimeout(resolve, minDisplayTime - elapsed));
        }
      }

      // Clear download progress after minimum display time
      setShowProgress(false);
      setDownloadProgress(null);

      // Unzip and process (using existing logic)
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(blobBuffer);

      // List all files in the ZIP
      const files = Object.keys(zipContent.files).filter((name) => !zipContent.files[name]?.dir);

      // Try to find the JSON file - either 'data.json' or any .json file
      let jsonFile = zipContent.file('data.json');

      if (!jsonFile) {
        // If data.json not found, look for any .json file
        const jsonFileName = files.find((name) => name.toLowerCase().endsWith('.json'));
        if (jsonFileName) {
          jsonFile = zipContent.file(jsonFileName);
        }
      }

      if (!jsonFile) {
        console.error('[Replay] No JSON file found in ZIP. Available files:', files);
        message.error(`Invalid zip file: No JSON file found. Found: ${files.join(', ')}`);
        setLoading(false);
        return;
      }

      const jsonText = await jsonFile.async('string');
      const collection: RecordCollection = JSON.parse(jsonText);

      // Check if the collection is in the correct format or needs conversion
      let normalizedCollection: RecordCollection = collection;

      if ('eventData' in collection && Array.isArray(collection.eventData)) {
        // This is the old format, convert it
        const timestamp = String(Date.now());
        const eventData = collection.eventData as any[];
        const responseData = (Array.isArray(collection.responseData) ? collection.responseData : []) as HarEntry[];
        normalizedCollection = {
          [timestamp]: {
            eventData,
            responseData,
          },
        };
      }

      const sessionIds = Object.keys(normalizedCollection);

      if (sessionIds.length === 0) {
        message.error('No sessions found in file');
        setLoading(false);
        return;
      }

      // Load the most recent session
      const latestSessionId = sessionIds.sort((a, b) => parseInt(b, 10) - parseInt(a, 10))[0];

      if (!latestSessionId) {
        message.error('No valid session ID found');
        setLoading(false);
        return;
      }

      const session = normalizedCollection[latestSessionId];

      if (!session) {
        message.error('Failed to parse session data');
        setLoading(false);
        return;
      }

      const eventData = session.eventData || [];

      setSessionData({
        eventData,
        responseData: session.responseData || [],
      });

      // Extract console logs from events
      extractConsoleLogs(eventData);

      setHasError(false);
      message.success(`Session ${id} loaded successfully`);
    } catch (error) {
      console.error('Failed to load session:', error);

      // Clear progress states
      setShowProgress(false);
      setDownloadProgress(null);

      // Friendly error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to download')
      ) {
        // Network-related errors - offer retry
        message.error({
          content: (
            <span>
              Network error while downloading session.{' '}
              <a
                onClick={() => {
                  message.destroy();
                  loadSessionById(id);
                }}
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                Click here to retry
              </a>
            </span>
          ),
          duration: 10,
        });
      } else {
        message.error(`Failed to load session: ${errorMessage}`);
      }

      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      setLoading(true);

      let collection: RecordCollection;

      // Check file type and handle accordingly
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Handle ZIP file
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        // List all files in the ZIP for debugging
        const files = Object.keys(zipContent.files).filter((name) => !zipContent.files[name]?.dir);

        // Try to find the JSON file - either 'data.json' or any .json file
        let jsonFile = zipContent.file('data.json');

        if (!jsonFile) {
          // If data.json not found, look for any .json file
          const jsonFileName = files.find((name) => name.toLowerCase().endsWith('.json'));
          if (jsonFileName) {
            jsonFile = zipContent.file(jsonFileName);
          }
        }

        if (!jsonFile) {
          console.error('[Upload] No JSON file found in ZIP. Available files:', files);
          message.error(`Invalid zip file: No JSON file found. Found: ${files.join(', ')}`);
          setLoading(false);
          return false;
        }

        const jsonText = await jsonFile.async('string');
        collection = JSON.parse(jsonText);
      } else {
        // Handle JSON/TXT file
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        collection = JSON.parse(content);
      }

      // Check if the collection is in the correct format or needs conversion
      // Correct format: { "sessionId": { eventData: [...], responseData: [...] } }
      // Old/test format: { eventData: [...], responseData: [...] }
      let normalizedCollection: RecordCollection = collection;

      if ('eventData' in collection && Array.isArray(collection.eventData)) {
        // This is the old format from test page, convert it
        const timestamp = String(Date.now());
        const eventData = collection.eventData as any[];
        const responseData = (Array.isArray(collection.responseData) ? collection.responseData : []) as HarEntry[];
        normalizedCollection = {
          [timestamp]: {
            eventData,
            responseData,
          },
        };
      }

      const sessionIds = Object.keys(normalizedCollection);

      if (sessionIds.length === 0) {
        message.error('No sessions found in file');
        setLoading(false);
        return false;
      }

      // Load the most recent session
      const latestSessionId = sessionIds.sort((a, b) => parseInt(b, 10) - parseInt(a, 10))[0];

      if (!latestSessionId) {
        message.error('No valid session ID found');
        setLoading(false);
        return false;
      }

      const session = normalizedCollection[latestSessionId];

      if (!session) {
        message.error('Failed to parse session data');
        setLoading(false);
        return false;
      }

      const eventData = session.eventData || [];

      setSessionData({
        eventData,
        responseData: session.responseData || [],
      });

      // Extract console logs from events
      extractConsoleLogs(eventData);

      setHasError(false);
      message.success(`Loaded session ${latestSessionId}`);
    } catch (error) {
      console.error('Failed to parse file:', error);
      message.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHasError(true);
    } finally {
      setLoading(false);
    }

    return false;
  };

  // Initialize rrweb player when session data is available
  useEffect(() => {
    if (!sessionData || sessionData.eventData.length === 0) {
      return;
    }

    if (!containerRef.current) {
      console.warn('[Replay] Container ref not ready');
      return;
    }

    // Validate event data
    const hasFullSnapshot = sessionData.eventData.some((event) => event.type === 2);
    if (!hasFullSnapshot) {
      console.error('[Replay] No full snapshot found in events');
      message.error('Invalid recording: missing initial snapshot');
      setHasError(true);
      return;
    }

    // Set up error suppression BEFORE any initialization
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: any[]) => {
      const msg = String(args[0] || '');
      const errorObj = args[0];

      // Get stack trace to identify error source
      let stack = '';
      if (errorObj instanceof Error) {
        stack = errorObj.stack || '';
      } else if (args[1] instanceof Error) {
        stack = args[1].stack || '';
      } else {
        // Try to get stack from Error object
        try {
          throw new Error();
        } catch (e: any) {
          stack = e.stack || '';
        }
      }

      // Only suppress errors that are DEFINITELY from rrweb-player or browser extensions
      const isRrwebError = stack.includes('rrweb-player.js') || stack.includes('rrweb-player.esm');
      const isExtensionError = stack.includes('apps.common.index') || stack.includes('chrome-extension://');

      if (isRrwebError || isExtensionError) {
        // Only suppress known non-fatal rrweb errors
        if (
          msg.includes('CssSyntaxError') ||
          msg.includes('Unclosed bracket') ||
          (msg.includes('Node with id') && isRrwebError) ||
          (msg.includes('prepend') && isExtensionError)
        ) {
          // Silent ignore - these are known non-fatal issues
          return;
        }
      }

      // All other errors should be logged normally
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const msg = String(args[0] || '');

      // Only suppress rrweb internal warnings
      if (
        (msg.includes('Node with id') || msg.includes('[replayer]')) &&
        (new Error().stack?.includes('rrweb-player') || false)
      ) {
        return;
      }

      originalConsoleWarn.apply(console, args);
    };

    // Delay initialization to ensure DOM is fully ready
    const initTimer = setTimeout(() => {
      try {
        // Clean up previous player
        if (playerRef.current) {
          try {
            playerRef.current.pause();
          } catch {
            // Ignore pause errors
          }
          playerRef.current = null;
        }

        // Ensure container still exists
        if (!containerRef.current) {
          console.debug('[Replay] Container disappeared during init');
          return;
        }

        // Clear container safely
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        // Create new player with v1 correct structure
        try {
          const containerWidth = containerRef.current.offsetWidth || 1200;

          const player = new rrwebPlayer({
            target: containerRef.current,
            // v1: UI config in props
            props: {
              events: sessionData.eventData,
              width: containerWidth - 2, // Subtract border width
              height: containerRef.current.offsetHeight - 2 || 600,
              autoPlay: false,
              speed: 1,
              showController: true,
              skipInactive: true,
              inactiveColor: '#D4D4D4', // Customize inactive periods color in progress bar
              // Enable console log replay
              replayLog: true,
            },
          } as any);

          playerRef.current = player;

          // Setup replayer event listeners
          const replayer = player.getReplayer();
          if (replayer) {
            console.log('[Replay] Player initialized successfully');

            // Disable interaction in the replayed iframe
            replayer.disableInteract();
          }

          // Listen to time updates
          try {
            if (replayer) {
              replayer.on('ui-update-current-time', (event: any) => {
                const timestamp = event as number;
                setCurrentTime(timestamp);
              });
            }
          } catch (error) {
            console.debug('[Replay] Failed to setup replayer events:', error);
          }
        } catch (error) {
          // Only log if it's not a CSS/DOM error
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (!errorMsg.includes('CssSyntaxError') && !errorMsg.includes('Unclosed bracket')) {
            console.error('[Replay] Player initialization failed:', error);
            throw error;
          }
          // CSS errors are non-fatal, player will work anyway
        }
      } catch (error) {
        console.error('[Replay] Initialization error:', error);
        message.error(`Replay failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setHasError(true);
      }
    }, 100); // Delay 100ms to ensure DOM is ready

    return () => {
      // Restore console functions
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      // Clean up timer and player
      clearTimeout(initTimer);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
        } catch {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [sessionData]);

  const extractConsoleLogs = (events: eventWithTime[]) => {
    const logs: LogInfo[] = [];
    const urls: Array<{ url: string; timestamp: number; trigger: string }> = [];

    // Extract console logs from rrweb events
    // rrweb records console logs as plugin events (type 6) with plugin name 'rrweb/console@1'
    events.forEach((event: any) => {
      // Console logs (type 6)
      if (event.type === 6 && event.data?.plugin === 'rrweb/console@1') {
        const payload = event.data.payload;
        if (payload && payload.level) {
          logs.push({
            level: payload.level,
            info: payload.payload || [],
            timestamp: event.timestamp, // Store timestamp for timeline sync
          });
        }
      }

      // URL change events (type 5, custom events)
      if (event.type === 5 && event.data?.tag === 'url-change') {
        const payload = event.data.payload;
        if (payload && payload.url) {
          urls.push({
            url: payload.url,
            timestamp: event.timestamp,
            trigger: payload.trigger,
          });
        }
      }
    });

    console.log('[Replay] Extracted', logs.length, 'console logs');
    console.log('[Replay] Extracted', urls.length, 'URL changes');

    setConsoleLogs(logs);
    setUrlHistory(urls);

    // Set initial URL
    if (urls.length > 0 && urls[0]) {
      setCurrentUrl(urls[0].url);
    }
  };

  // Update current URL based on playback time
  useEffect(() => {
    if (urlHistory.length === 0 || !urlHistory[0]) return;

    // Find the most recent URL change before or at the current time
    let matchedUrl = urlHistory[0].url;
    for (const urlChange of urlHistory) {
      if (urlChange.timestamp <= currentTime) {
        matchedUrl = urlChange.url;
      } else {
        break;
      }
    }

    if (matchedUrl !== currentUrl) {
      setCurrentUrl(matchedUrl);
    }
  }, [currentTime, urlHistory, currentUrl]);

  const handleSeekToTime = (timestamp: number) => {
    const player = playerRef.current;
    if (player && sessionData) {
      try {
        // Calculate time offset from the start of the recording
        const startTime = sessionData.eventData[0]?.timestamp || 0;
        const timeOffset = timestamp - startTime;

        console.log('[Replay] Seeking to timestamp:', timestamp, 'start:', startTime, 'offset:', timeOffset, 'ms');

        // Use player.goto method which is the correct way to seek in rrweb-player
        player.goto(timeOffset, false); // false = pause after seeking
        setCurrentTime(timestamp);
      } catch (error) {
        console.error('[Replay] Failed to seek:', error);
        message.error('Failed to seek to the specified time');
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format bytes to human-readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format speed in bytes/s to human-readable string
  const formatSpeed = (bytesPerSec: number): string => {
    return `${formatBytes(bytesPerSec)}/s`;
  };

  // Format seconds to human-readable duration string
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Session Replay</Title>
          {sessionId && <Text type="secondary">Session ID: {sessionId}</Text>}
        </div>
        <Space>
          <Upload beforeUpload={handleUpload} accept=".json,.txt,.zip" showUploadList={false}>
            <Button type="primary" icon={<InboxOutlined />} loading={loading}>
              Upload Session File
            </Button>
          </Upload>
          <Button type="default" onClick={() => setShowJiraModal(true)} disabled={!sessionData}>
            Create Jira Ticket
          </Button>
        </Space>
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

      {showProgress && downloadProgress && (
        <Card>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>Downloading session file...</Text>
            <Progress
              percent={Math.round(downloadProgress.percentage)}
              status="active"
              format={(percent) => `${percent}%`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">
                {formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)}
              </Text>
              <Text type="secondary">
                {formatSpeed(downloadProgress.speed)}
                {downloadProgress.remainingTime > 0 &&
                  downloadProgress.remainingTime < 3600 &&
                  ` • ${formatDuration(downloadProgress.remainingTime)} remaining`}
              </Text>
            </div>
          </Space>
        </Card>
      )}

      {!sessionData && !loading && (
        <Card>
          <Dragger beforeUpload={handleUpload} accept=".json,.txt,.zip" showUploadList={false} disabled={loading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to upload</p>
            <p className="ant-upload-hint">Upload a session file (JSON, TXT, or ZIP format) to start replay</p>
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

          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: '750px' }}>
            {/* Player Section */}
            <Card
              title="Session Player"
              extra={
                sessionData.eventData[0] && (
                  <Text type="secondary">Start: {formatTime(sessionData.eventData[0].timestamp)}</Text>
                )
              }
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              styles={{
                body: {
                  flex: 1,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
            >
              {/* URL Display Bar */}
              {currentUrl && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: '#f0f5ff',
                    borderRadius: 4,
                    border: '1px solid #d6e4ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#1890ff', fontSize: 14, fontWeight: 500 }}>🔗</span>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: '#262626',
                    }}
                    ellipsis={{ tooltip: currentUrl }}
                  >
                    {currentUrl}
                  </Text>
                </div>
              )}

              {/* Player Container */}
              <div
                ref={containerRef}
                style={{
                  flex: 1,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  backgroundColor: '#f5f5f5',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: 'auto', // Will be controlled by rrweb player
                }}
              />
            </Card>

            {/* Panels Section */}
            <Card
              title="Session Details"
              style={{
                flex: '1',
                maxWidth: '45%',
                display: 'flex',
                flexDirection: 'column',
              }}
              styles={{
                body: {
                  flex: 1,
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
            >
              <Tabs
                defaultActiveKey="logs"
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                tabBarStyle={{ flexShrink: 0, marginBottom: 0, paddingLeft: 16 }}
                items={[
                  {
                    key: 'logs',
                    label: `Console (${consoleLogs.length})`,
                    children: (
                      <div style={{ height: 'calc(100% - 46px)', overflow: 'hidden' }}>
                        <ConsolePanel logs={consoleLogs} currentTime={currentTime} onSeekToTime={handleSeekToTime} />
                      </div>
                    ),
                  },
                  {
                    key: 'network',
                    label: `Network (${sessionData.responseData.length})`,
                    children: (
                      <div style={{ height: 'calc(100% - 46px)', overflow: 'hidden' }}>
                        <NetworkPanel
                          requests={sessionData.responseData}
                          currentTime={currentTime}
                          onSeekToTime={handleSeekToTime}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'ai-analysis',
                    label: '🤖 AI Analysis',
                    children: (
                      <div style={{ height: 'calc(100% - 46px)', overflow: 'hidden' }}>
                        <AIAnalysisPanel
                          logs={consoleLogs}
                          requests={sessionData.responseData}
                          onOpenSettings={() => setShowSettings(true)}
                          onSeekToTime={handleSeekToTime}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <Modal
        title="OpenAI Settings"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={900}
      >
        <OpenAISettings />
      </Modal>

      {/* Jira Modal */}
      <CreateJiraModal
        visible={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        sessionId={sessionId}
        logs={consoleLogs}
        requests={sessionData?.responseData || []}
      />
    </Space>
  );
}
