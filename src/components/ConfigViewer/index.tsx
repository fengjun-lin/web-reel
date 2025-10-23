/**
 * Config Viewer Component
 * Shows where OpenAI configuration is stored and its status
 */

import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Alert, Card, Descriptions, Space, Tag, Typography } from 'antd';

import { getEnvConfig, getRuntimeConfig, isOpenAIConfigured } from '@/config/openai';

const { Text, Paragraph } = Typography;

export default function ConfigViewer() {
  const envConfig = getEnvConfig();
  const runtimeConfig = getRuntimeConfig();
  const isConfigured = isOpenAIConfigured();

  const maskApiKey = (key?: string) => {
    if (!key) return 'Not set';
    if (key.length < 20) return '***';
    return `${key.slice(0, 10)}...${key.slice(-4)}`;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Overall Status */}
      <Card>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 16 }}>
              OpenAI Configuration Status
            </Text>
            {isConfigured ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                Configured
              </Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="error">
                Not Configured
              </Tag>
            )}
          </div>
        </Space>
      </Card>

      {/* Environment Variables Config */}
      <Card
        title={
          <Space>
            <Text>Environment Variables (.env.local)</Text>
            {envConfig.apiKey ? <Tag color="success">Set</Tag> : <Tag color="default">Not Set</Tag>}
          </Space>
        }
        size="small"
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="API Key">
            <Space>
              <Text code>{maskApiKey(envConfig.apiKey)}</Text>
              {!envConfig.apiKey && <Text type="secondary">(Not configured)</Text>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="API Base">
            <Text code>{envConfig.apiBase || 'Default'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Model">
            <Text code>{envConfig.model || 'gpt-4o-mini'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Storage Location">
            <Text type="secondary">/Users/fengjunlin/projects/web-reel/.env.local</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            <Space direction="vertical" size="small">
              <Text>• Persistent (until file is deleted)</Text>
              <Text>• Requires server restart to take effect</Text>
              <Text>• Excluded from git (in .gitignore)</Text>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* LocalStorage Config */}
      <Card
        title={
          <Space>
            <Text>Browser Storage (localStorage)</Text>
            {runtimeConfig ? <Tag color="success">Set</Tag> : <Tag color="default">Not Set</Tag>}
          </Space>
        }
        size="small"
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="API Key">
            <Space>
              <Text code>{maskApiKey(runtimeConfig?.apiKey)}</Text>
              {!runtimeConfig?.apiKey && <Text type="secondary">(Not configured)</Text>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="API Base">
            <Text code>{runtimeConfig?.apiBase || 'Default'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Model">
            <Text code>{runtimeConfig?.model || 'gpt-4o-mini'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Storage Location">
            <Text type="secondary">Browser localStorage (key: web-reel-openai-config)</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            <Space direction="vertical" size="small">
              <Text>• Persistent (until browser data is cleared)</Text>
              <Text>• No restart needed, takes effect immediately</Text>
              <Text>• Higher priority than environment variables</Text>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Priority Info */}
      <Alert
        message="Configuration Priority"
        description={
          <Space direction="vertical" size="small">
            <Paragraph style={{ margin: 0 }}>
              1. <Text strong>localStorage Configuration</Text> (Browser) - Highest priority
            </Paragraph>
            <Paragraph style={{ margin: 0 }}>
              2. <Text strong>.env.local Configuration</Text> (File) - Fallback
            </Paragraph>
            <Paragraph style={{ margin: '8px 0 0 0' }}>
              <Text type="secondary">If both are configured, localStorage configuration will override .env.local.</Text>
            </Paragraph>
          </Space>
        }
        type="info"
        showIcon
        icon={<EyeOutlined />}
      />

      {/* Quick Actions Info */}
      <Card title="Quick Actions" size="small">
        <Space direction="vertical" size="small">
          <Text>
            <Text strong>Check Configuration:</Text>
          </Text>
          <Text code style={{ display: 'block', padding: 8, background: '#f5f5f5' }}>
            ./scripts/check-openai.sh
          </Text>

          <Text style={{ marginTop: 8 }}>
            <Text strong>Setup API Key:</Text>
          </Text>
          <Text code style={{ display: 'block', padding: 8, background: '#f5f5f5' }}>
            ./scripts/setup-openai.sh
          </Text>

          <Text style={{ marginTop: 8 }}>
            <Text strong>View Browser Config:</Text>
          </Text>
          <Text code style={{ display: 'block', padding: 8, background: '#f5f5f5' }}>
            localStorage.getItem(&apos;web-reel-openai-config&apos;)
          </Text>
        </Space>
      </Card>
    </Space>
  );
}
