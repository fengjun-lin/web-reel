import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Empty, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import JSZip from 'jszip';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import UploadFlagSwitch from '@/components/UploadFlagSwitch';
import type { RecordCollection } from '@/recorder';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface SessionInfo {
  sessionId: string;
  eventCount: number;
  networkCount: number;
  startTime: number;
  size: number;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceId, setLdap] = useState<string>('');
  const [appId] = useState<number>(1); // Default to appId 1

  // Load sessions from IndexedDB or localStorage
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // TODO: Load from IndexedDB when available
      // For now, just show empty state
      setSessions([]);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      message.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    try {
      setLoading(true);

      // Check file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.txt') && !file.name.endsWith('.zip')) {
        message.error('Please upload a JSON, TXT, or ZIP file');
        setLoading(false);
        return false;
      }

      let collection: RecordCollection;

      if (file.name.endsWith('.zip')) {
        // Handle ZIP file
        const zip = await JSZip.loadAsync(file);
        const files = Object.keys(zip.files);

        if (files.length === 0) {
          message.error('ZIP file is empty');
          setLoading(false);
          return false;
        }

        // Load all session files
        collection = {};
        for (const fileName of files) {
          if (fileName.endsWith('.json')) {
            const zipFile = zip.files[fileName];
            if (!zipFile) continue;

            const content = await zipFile.async('string');
            const sessionData = JSON.parse(content);

            // Extract session ID from filename (e.g., session-1234567890.json)
            const match = fileName.match(/session-(\d+)\.json/);
            if (match && match[1]) {
              collection[match[1]] = sessionData;
            }
          }
        }
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

      // Parse sessions
      const sessionInfos: SessionInfo[] = Object.keys(collection).map((sessionId) => {
        const session = collection[sessionId];
        if (!session) {
          return {
            sessionId,
            eventCount: 0,
            networkCount: 0,
            startTime: parseInt(sessionId, 10),
            size: 0,
          };
        }

        return {
          sessionId,
          eventCount: session.eventData?.length || 0,
          networkCount: session.responseData?.length || 0,
          startTime: parseInt(sessionId, 10),
          size: JSON.stringify(session).length,
        };
      });

      // Store in sessionStorage for replay
      sessionStorage.setItem('uploadedSessions', JSON.stringify(collection));

      setSessions(sessionInfos);
      message.success(`Loaded ${sessionInfos.length} session(s)`);
    } catch (error) {
      console.error('Failed to parse file:', error);
      message.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }

    return false;
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/replayer/${sessionId}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>Session Management</Title>
        <Text type="secondary">Upload recorded sessions to view and replay user interactions</Text>
      </div>

      <Alert
        message="Session Recording"
        description="To record sessions, integrate the Web-Reel Recorder SDK into your application. Recorded sessions can be exported and uploaded here for replay."
        type="info"
        showIcon
      />

      <Card title="Upload Settings">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>User Device ID: </Text>
            <Input
              placeholder="Enter your Device ID (e.g., john.doe)"
              value={deviceId}
              onChange={(e) => setLdap(e.target.value)}
              style={{ width: 300, marginLeft: 8 }}
            />
          </div>
          <UploadFlagSwitch appId={appId} deviceId={deviceId} />
        </Space>
      </Card>

      <Divider />

      <Card title="Upload Sessions">
        <Dragger beforeUpload={handleUpload} accept=".json,.txt,.zip" showUploadList={false} disabled={loading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for JSON, TXT, or ZIP files containing session data. Files are processed locally and not uploaded to
            any server.
          </p>
        </Dragger>
      </Card>

      <Card title="Available Sessions">
        {sessions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No sessions available. Upload a session file to get started."
          >
            <Upload beforeUpload={handleUpload} accept=".json,.txt,.zip" showUploadList={false}>
              <Button type="primary" icon={<UploadOutlined />}>
                Upload Now
              </Button>
            </Upload>
          </Empty>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {sessions.map((session) => (
              <Card key={session.sessionId} size="small" hoverable onClick={() => handleViewSession(session.sessionId)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space direction="vertical" size={4}>
                    <Text strong>Session ID: {session.sessionId}</Text>
                    <Text type="secondary">Start Time: {formatDate(session.startTime)}</Text>
                    <Space size="large">
                      <Text type="secondary">Events: {session.eventCount}</Text>
                      <Text type="secondary">Network: {session.networkCount}</Text>
                      <Text type="secondary">Size: {formatSize(session.size)}</Text>
                    </Space>
                  </Space>
                  <Button type="primary" onClick={() => handleViewSession(session.sessionId)}>
                    View Replay
                  </Button>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
