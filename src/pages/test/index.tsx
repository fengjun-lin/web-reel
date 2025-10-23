import { Button, Card, Divider, Space, Typography, message } from 'antd';
import { useRef, useState } from 'react';

import { WebReelRecorder } from '@/recorder';
import { Env } from '@/types';

const { Title, Text } = Typography;

export default function RecorderTestPage() {
  const recorderRef = useRef<WebReelRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<number>(0);
  const [eventCount, setEventCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);

  const initRecorder = () => {
    try {
      const recorder = new WebReelRecorder({
        env: Env.TEST,
        deviceId: 'test-device',
        appId: 1,
        projectName: 'web-reel-test',
        recordInterval: 10000,
        disabledDownLoad: false,
        enableStats: false, // Disable stats to avoid API errors
      });

      recorderRef.current = recorder;
      setIsRecording(true);

      // Wait for recorder to be fully initialized
      const checkInitialized = setInterval(() => {
        if (recorder.isInitialized()) {
          clearInterval(checkInitialized);
          setSessionId(recorder.getSessionId());
          message.success('Recording SDK started!');
        }
      }, 100);

      const interval = setInterval(async () => {
        if (recorder && recorder.isInitialized()) {
          const db = recorder.getDB();
          const sid = recorder.getSessionId();

          try {
            const events = await db.get('renderEvent', String(sid));
            const requests = await db.get('responseData', String(sid));

            setEventCount(events?.length || 0);
            setNetworkCount(requests?.length || 0);
          } catch (error) {
            // Silently ignore errors during initialization
            if (error instanceof Error && !error.message.includes('not found')) {
              console.error('Failed to get stats:', error);
            }
          }
        }
      }, 2000);

      return () => {
        clearInterval(checkInitialized);
        clearInterval(interval);
      };
    } catch (error) {
      console.error('Failed to initialize recorder:', error);
      message.error('Recording SDK failed to start');
    }
  };

  const stopRecorder = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);
      message.info('Recording SDK stopped');
    }
  };

  const exportJSON = async () => {
    if (recorderRef.current) {
      try {
        await recorderRef.current.exportLog(false);
        message.success('Exported as JSON successfully!');
      } catch {
        message.error('Export failed');
      }
    }
  };

  const exportZIP = async () => {
    if (recorderRef.current) {
      try {
        await recorderRef.current.exportLog(true);
        message.success('Exported as ZIP successfully!');
      } catch {
        message.error('Export failed');
      }
    }
  };

  const makeTestRequest = async () => {
    try {
      await fetch('https://jsonplaceholder.typicode.com/posts/1');

      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://jsonplaceholder.typicode.com/users/1');
      xhr.send();

      message.success('Test requests sent');
    } catch {
      message.error('Request failed');
    }
  };

  const makeTestLogs = () => {
    console.log('Test log message');
    console.info('Test info message');
    console.warn('Test warning message');
    console.error('Test error message');
    message.success('Test logs output to console');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <Title level={2}>Recording SDK Test Page</Title>

      <Card title="Control Panel">
        <Space wrap>
          {!isRecording ? (
            <Button type="primary" onClick={initRecorder}>
              Start Recording
            </Button>
          ) : (
            <Button danger onClick={stopRecorder}>
              Stop Recording
            </Button>
          )}

          <Button onClick={exportJSON} disabled={!isRecording}>
            Export JSON
          </Button>

          <Button onClick={exportZIP} disabled={!isRecording}>
            Export ZIP
          </Button>
        </Space>
      </Card>

      <Card title="Recording Status">
        <Space direction="vertical" size="small">
          <Text>
            <Text strong>Status: </Text>
            {isRecording ? <Text type="success">Recording</Text> : <Text type="secondary">Stopped</Text>}
          </Text>
          <Text>
            <Text strong>Session ID: </Text>
            <Text code>{sessionId || 0}</Text>
          </Text>
          <Text>
            <Text strong>DOM Events: </Text>
            <Text type="success">{eventCount}</Text>
          </Text>
          <Text>
            <Text strong>Network Requests: </Text>
            <Text type="success">{networkCount}</Text>
          </Text>
        </Space>
      </Card>

      <Card title="Test Actions">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>DOM Events Test:</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                <Button onClick={() => message.info('Button clicked')}>Click Me</Button>
                <input type="text" placeholder="Type here" style={{ padding: '4px 8px' }} />
                <select>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
              </Space>
            </div>
          </div>

          <Divider />

          <div>
            <Text strong>Network Request Test:</Text>
            <div style={{ marginTop: 8 }}>
              <Button type="primary" onClick={makeTestRequest}>
                Send Test Requests
              </Button>
            </div>
          </div>

          <Divider />

          <div>
            <Text strong>Console Logs Test:</Text>
            <div style={{ marginTop: 8 }}>
              <Button type="default" onClick={makeTestLogs}>
                Output Test Logs
              </Button>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="Test Instructions">
        <Space direction="vertical">
          <Text>1. Click &quot;Start Recording&quot; to begin</Text>
          <Text>2. Perform test actions (click buttons, type text, send requests)</Text>
          <Text>3. Check status panel for event/request counts</Text>
          <Text>4. Open DevTools → Application → IndexedDB → WebReelDB</Text>
          <Text>5. Verify renderEvent and responseData tables have data</Text>
          <Text>6. Click &quot;Export ZIP&quot; to download recording</Text>
          <Text>7. Go to home page and upload the file to test replay</Text>
        </Space>
      </Card>
    </Space>
  );
}
