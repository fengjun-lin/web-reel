/**
 * OpenAI Settings Component
 * Allows users to configure OpenAI API key at runtime
 */

import { CheckCircleOutlined, CloseCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Form, Input, Space, Spin, Tabs, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import ConfigViewer from '@/components/ConfigViewer';
import {
  checkEnvConfig,
  clearRuntimeConfig,
  getOpenAIConfig,
  getRuntimeConfig,
  saveRuntimeConfig,
  validateApiKey,
} from '@/config/openai';
import { testConnection } from '@/services/openai';

const { Title, Text, Paragraph, Link } = Typography;

export default function OpenAISettings() {
  const [form] = Form.useForm();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [envConfigStatus, setEnvConfigStatus] = useState<{ hasApiKey: boolean; loading: boolean }>({
    hasApiKey: false,
    loading: true,
  });

  const runtimeConfig = getRuntimeConfig();
  const isConfigured = runtimeConfig?.apiKey || envConfigStatus.hasApiKey;

  // Check environment configuration on mount
  useEffect(() => {
    checkEnvConfig().then((config) => {
      setEnvConfigStatus({
        hasApiKey: config.hasApiKey,
        loading: false,
      });
    });
  }, []);

  const handleSave = async (values: any) => {
    try {
      // Validate API key format
      if (values.apiKey && !validateApiKey(values.apiKey)) {
        message.error('Invalid API key format. OpenAI keys should start with "sk-".');
        return;
      }

      // Save configuration
      saveRuntimeConfig({
        apiKey: values.apiKey,
        apiBase: values.apiBase || 'https://api.openai.com/v1',
        model: values.model || 'gpt-4o-mini',
      });

      message.success('Configuration saved successfully!');
      setTestResult(null);

      // Refresh configuration status
      const config = await checkEnvConfig();
      setEnvConfigStatus({
        hasApiKey: config.hasApiKey || !!values.apiKey,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      message.error('Failed to save configuration');
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const result = await testConnection();
      setTestResult(result);

      if (result.success) {
        message.success('Connection test successful!');
      } else {
        message.error('Connection test failed');
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    clearRuntimeConfig();
    form.resetFields();
    setTestResult(null);
    message.success('Configuration cleared');

    // Refresh configuration status
    const config = await checkEnvConfig();
    setEnvConfigStatus({
      hasApiKey: config.hasApiKey,
      loading: false,
    });
  };

  const handleLoadCurrent = () => {
    try {
      const config = getOpenAIConfig();
      form.setFieldsValue({
        apiKey: config.apiKey,
        apiBase: config.apiBase,
        model: config.model,
      });
      message.success('Loaded current configuration');
    } catch {
      message.error('No configuration found');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={3}>OpenAI Configuration</Title>
          <Paragraph type="secondary">
            Configure your OpenAI API key to enable AI-powered session analysis. Your API key will be stored locally in
            your browser and never sent to any server except OpenAI.
          </Paragraph>
        </div>

        <Tabs
          defaultActiveKey="config"
          items={[
            {
              key: 'config',
              label: '⚙️ Configuration',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {renderConfigContent()}
                </Space>
              ),
            },
            {
              key: 'status',
              label: '📊 Status View',
              children: <ConfigViewer />,
            },
          ]}
        />
      </Space>
    </div>
  );

  function renderConfigContent() {
    return (
      <>
        {/* Status */}
        <Card size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Configuration Status:</Text>
              {envConfigStatus.loading ? (
                <Space>
                  <Spin size="small" />
                  <Text type="secondary">Checking...</Text>
                </Space>
              ) : isConfigured ? (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <Text type="success">Configured</Text>
                </Space>
              ) : (
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                  <Text type="danger">Not Configured</Text>
                </Space>
              )}
            </div>
            {runtimeConfig && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Using runtime configuration from browser storage
              </Text>
            )}
            {!runtimeConfig && envConfigStatus.hasApiKey && !envConfigStatus.loading && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Using API key from environment variables (.env.local)
              </Text>
            )}
          </Space>
        </Card>

        <Divider />

        {/* Configuration Form */}
        <Card title="API Configuration">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              apiBase: 'https://api.openai.com/v1',
              model: 'gpt-4o-mini',
            }}
          >
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[
                { required: true, message: 'Please enter your OpenAI API key' },
                {
                  validator: (_, value) => {
                    if (!value || validateApiKey(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Invalid API key format'));
                  },
                },
              ]}
              extra="Get your API key from https://platform.openai.com/api-keys"
            >
              <Input.Password
                placeholder="sk-..."
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                visibilityToggle={{ visible: showApiKey, onVisibleChange: setShowApiKey }}
              />
            </Form.Item>

            <Form.Item
              label="API Base URL"
              name="apiBase"
              extra="Change this if you're using a proxy or custom OpenAI endpoint"
            >
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>

            <Form.Item
              label="Model"
              name="model"
              extra="gpt-4o-mini is recommended for cost efficiency. You can also use gpt-4 or gpt-3.5-turbo."
            >
              <Input placeholder="gpt-4o-mini" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Save Configuration
                </Button>
                {isConfigured && <Button onClick={handleLoadCurrent}>Load Current Config</Button>}
                {runtimeConfig && (
                  <Button danger onClick={handleClear}>
                    Clear Configuration
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Test Connection */}
        <Card title="Test Connection">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph type="secondary">
              Test your API key to make sure it works correctly. This will send a simple request to OpenAI.
            </Paragraph>

            <Button
              type="primary"
              onClick={handleTest}
              loading={testing}
              disabled={!isConfigured}
              icon={testing ? <Spin size="small" /> : undefined}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            {testResult && (
              <Alert
                type={testResult.success ? 'success' : 'error'}
                message={testResult.success ? 'Connection Successful' : 'Connection Failed'}
                description={testResult.message}
                showIcon
                closable
                onClose={() => setTestResult(null)}
              />
            )}
          </Space>
        </Card>

        {/* Security Notice */}
        <Alert
          type="info"
          message="Security & Privacy"
          description={
            <Space direction="vertical" size="small">
              <Text>
                • Your API key is stored locally in your browser&apos;s localStorage and never sent to our servers
              </Text>
              <Text>• Session data is sent directly to OpenAI&apos;s API for analysis (not to our servers)</Text>
              <Text>• We recommend using a separate API key with usage limits for added security</Text>
              <Text>
                • You can revoke your API key anytime at{' '}
                <Link href="https://platform.openai.com/api-keys" target="_blank">
                  OpenAI Dashboard
                </Link>
              </Text>
            </Space>
          }
          showIcon
        />

        {/* Cost Estimation */}
        <Card title="Cost Estimation" size="small">
          <Space direction="vertical" size="small">
            <Text>
              <Text strong>gpt-4o-mini:</Text> ~$0.01-0.05 per analysis (recommended)
            </Text>
            <Text>
              <Text strong>gpt-4:</Text> ~$0.10-0.30 per analysis
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Actual cost depends on the amount of data being analyzed. We limit analysis to the last 1000 logs and 500
              requests to keep costs reasonable.
            </Text>
          </Space>
        </Card>
      </>
    );
  }
}
