/**
 * Create Jira Ticket Modal Component
 * Allows users to create Jira tickets with session data context
 */

import { CheckCircleOutlined, ExclamationCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Button, message, Space, Spin, Typography, Tooltip } from 'antd';
import { useEffect, useState } from 'react';

import { checkEnvConfig as checkJiraEnvConfig, getRuntimeConfig as getJiraRuntimeConfig } from '@/config/jira';
import { checkEnvConfig as checkOpenAIEnvConfig, getRuntimeConfig as getOpenAIRuntimeConfig } from '@/config/openai';
import { createJiraTicket } from '@/services/jira';
import { chatCompletion } from '@/services/openai';
import type { LogInfo } from '@/types';
import type { HarEntry } from '@/types/har';
import { prepareAnalysisData, buildJiraCompactPrompt, type AnalysisData } from '@/utils/analysisHelper';

const { TextArea } = Input;
const { Text, Link } = Typography;

interface CreateJiraModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId?: string;
  logs?: LogInfo[];
  requests?: HarEntry[];
  onJiraCreated?: (_issueKey: string) => void;
}

export default function CreateJiraModal({
  visible,
  onClose,
  sessionId,
  logs = [],
  requests = [],
  onJiraCreated,
}: CreateJiraModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{
    issueKey: string;
    issueUrl: string;
  } | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    isConfigured: boolean;
    loading: boolean;
  }>({
    isConfigured: false,
    loading: true,
  });
  const [openAIConfigured, setOpenAIConfigured] = useState(false);

  // Check configuration status on mount and when modal opens
  useEffect(() => {
    if (visible) {
      checkConfig();
    }
  }, [visible]);

  const checkConfig = async () => {
    setConfigStatus({ isConfigured: false, loading: true });

    // Check Jira runtime config first (localStorage)
    const jiraRuntimeConfig = getJiraRuntimeConfig();
    if (jiraRuntimeConfig?.apiKey && jiraRuntimeConfig?.userEmail) {
      setConfigStatus({ isConfigured: true, loading: false });
    } else {
      // Check Jira environment config via API
      const jiraEnvConfig = await checkJiraEnvConfig();
      setConfigStatus({
        isConfigured: jiraEnvConfig.hasApiKey && jiraEnvConfig.hasUserEmail,
        loading: false,
      });
    }

    // Check OpenAI config for AI generation feature
    const openAIRuntimeConfig = getOpenAIRuntimeConfig();
    if (openAIRuntimeConfig?.apiKey) {
      setOpenAIConfigured(true);
    } else {
      const openAIEnvConfig = await checkOpenAIEnvConfig();
      setOpenAIConfigured(openAIEnvConfig.hasApiKey);
    }
  };

  const jiraConfigured = configStatus.isConfigured;

  // AI Generation: Use OpenAI to generate smart description
  const handleAIGenerate = async () => {
    if (!logs.length && !requests.length) {
      message.warning('No session data available for AI analysis');
      return;
    }

    if (!openAIConfigured) {
      message.error('OpenAI is not configured. Please configure it in Settings.');
      return;
    }

    setGeneratingAI(true);

    try {
      const data = prepareAnalysisData(logs, requests, {
        logLimit: 100,
        requestLimit: 50,
        includeStackTrace: false, // Reduce token usage
      });

      const prompt = buildJiraCompactPrompt(data);

      // Call OpenAI API
      const response = await chatCompletion({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.3,
        maxTokens: 1500,
      });

      // Parse AI response
      let aiResult;
      try {
        // Try to parse as JSON
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        message.error('Failed to parse AI response');
        setGeneratingAI(false);
        return;
      }

      // Format AI result into Jira description
      const aiDescription = formatAIResultToDescription(aiResult, data, sessionId);
      const aiSummary = aiResult.summary || `Bug Report: Session ${sessionId || 'Unknown'}`;

      form.setFieldsValue({
        summary: aiSummary.slice(0, 255),
        description: aiDescription,
      });

      message.success('AI-generated description created successfully!');
    } catch (error) {
      console.error('AI generation failed:', error);
      message.error('Failed to generate AI description. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const result = await createJiraTicket({
        summary: values.summary,
        description: values.description,
      });

      if (result.success && result.issueKey && result.issueUrl) {
        message.success(`Jira ticket ${result.issueKey} created successfully!`);
        setCreatedTicket({
          issueKey: result.issueKey,
          issueUrl: result.issueUrl,
        });

        // Notify parent component
        if (onJiraCreated) {
          onJiraCreated(result.issueKey);
        }

        // Patch Jira ID to session
        if (sessionId) {
          try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jira_id: result.issueKey,
              }),
            });

            if (response.ok) {
              console.log(`Session ${sessionId} updated with Jira ID: ${result.issueKey}`);
            } else {
              console.error('Failed to update session with Jira ID');
            }
          } catch (error) {
            console.error('Error updating session with Jira ID:', error);
          }
        }

        // Don't close immediately to show success message
      } else {
        message.error(`Failed to create Jira ticket: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create Jira ticket:', error);
      message.error('Failed to create Jira ticket. Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    form.resetFields();
    setCreatedTicket(null);
    onClose();
  };

  // Initialize form with default values
  const replayUrl = sessionId ? `https://tubi-web-reel.vercel.app/replayer/${sessionId}` : '';

  const initialValues = {
    summary: `Bug Report: Session ${sessionId || 'Unknown'}`,
    description: `h3. Environment

h3. Precondition

h3. Steps

h3. Expected result

h3. Actual result

h3. Replay URL
${replayUrl}
`,
  };

  const hasSessionData = logs.length > 0 || requests.length > 0;

  return (
    <Modal
      title="Create Jira Ticket"
      open={visible}
      onCancel={handleClose}
      width={700}
      footer={
        createdTicket ? (
          <Space>
            <Button onClick={handleClose}>Close</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => window.open(createdTicket.issueUrl, '_blank')}
            >
              View Ticket
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!jiraConfigured || configStatus.loading}
            >
              Create Ticket
            </Button>
          </Space>
        )
      }
    >
      {configStatus.loading && (
        <div style={{ marginBottom: 16, textAlign: 'center', padding: '16px 0' }}>
          <Space direction="vertical" size="small">
            <Spin />
            <Text type="secondary">Checking Jira configuration...</Text>
          </Space>
        </div>
      )}

      {!configStatus.loading && !jiraConfigured && (
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="warning">
              <ExclamationCircleOutlined /> Jira is not configured. Please set up your Jira credentials in{' '}
              <code>.env.local</code> file.
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Required environment variables: JIRA_API_KEY, JIRA_USER_EMAIL (server-side), NEXT_PUBLIC_JIRA_DOMAIN,
              NEXT_PUBLIC_JIRA_PROJECT_KEY (client-side)
            </Text>
          </Space>
        </div>
      )}

      {createdTicket ? (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <div>
              <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                Ticket Created Successfully!
              </Text>
              <Space direction="vertical" size="small">
                <Text type="secondary">Issue Key:</Text>
                <Link href={createdTicket.issueUrl} target="_blank" style={{ fontSize: 18 }}>
                  {createdTicket.issueKey}
                </Link>
              </Space>
            </div>
          </div>
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          disabled={!jiraConfigured || configStatus.loading}
        >
          <Form.Item
            name="summary"
            label="Summary"
            rules={[
              { required: true, message: 'Please enter a summary' },
              { max: 255, message: 'Summary must be less than 255 characters' },
            ]}
          >
            <Input placeholder="Brief description of the issue" />
          </Form.Item>

          <Form.Item
            name="description"
            label={
              <Space>
                <span>Description</span>
                {hasSessionData && openAIConfigured && (
                  <Tooltip title="Use AI to generate intelligent description based on session data">
                    <Button
                      type="link"
                      size="small"
                      icon={<RobotOutlined />}
                      onClick={handleAIGenerate}
                      loading={generatingAI}
                      style={{ padding: '0 4px' }}
                    >
                      AI Generate
                    </Button>
                  </Tooltip>
                )}
              </Space>
            }
            rules={[
              { required: true, message: 'Please enter a description' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={12}
              placeholder="Detailed description of the issue including steps to reproduce"
              disabled={generatingAI}
            />
          </Form.Item>

          <Space direction="vertical" style={{ width: '100%' }}>
            {hasSessionData && openAIConfigured && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                💡 Tip: Click &quot;AI Generate&quot; to auto-fill the description with intelligent analysis.
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              This will create a Bug ticket in the WR project. You can edit the fields above before creating the ticket.
            </Text>
          </Space>
        </Form>
      )}
    </Modal>
  );
}

/* ==================== Helper Functions ==================== */

/**
 * Format AI result into Jira description (using Jira Wiki Markup)
 */
function formatAIResultToDescription(
  aiResult: {
    summary?: string;
    type?: string;
    evidence?: string[];
    fix?: string;
    labels?: string[];
  },
  data: AnalysisData,
  sessionId?: string,
): string {
  const sections: string[] = [];

  // Environment Section
  sections.push(`h3. Environment`);
  sections.push(`*Session ID:* ${sessionId || 'Unknown'}`);
  sections.push(`*Issue Type:* ${aiResult.type || 'Unknown'}`);
  if (aiResult.labels && aiResult.labels.length > 0) {
    sections.push(`*Labels:* ${aiResult.labels.join(', ')}`);
  }
  sections.push(`*Timestamp:* ${new Date(data.sessionStartTime || Date.now()).toISOString()}`);
  sections.push('');

  // Precondition Section
  sections.push(`h3. Precondition`);
  sections.push(`${aiResult.summary || 'Issue detected in session'}`);
  sections.push(`*Console Errors:* ${data.summary.errorCount} | *Network Errors:* ${data.summary.networkErrorCount}`);
  sections.push('');

  // Steps Section
  sections.push(`h3. Steps`);
  if (aiResult.evidence && aiResult.evidence.length > 0) {
    aiResult.evidence.forEach((item) => {
      sections.push(`# ${item}`);
    });
  } else if (data.errors.length > 0 || data.networkErrors.length > 0) {
    if (data.errors.length > 0 && data.errors[0]) {
      sections.push(`# ${data.errors[0].message}`);
    }
    if (data.networkErrors.length > 0 && data.networkErrors[0]) {
      const req = data.networkErrors[0];
      sections.push(`# ${req.method} ${req.url} returned ${req.status}`);
    }
  }
  sections.push('');

  // Expected Result Section
  sections.push(`h3. Expected result`);
  if (aiResult.fix) {
    sections.push(aiResult.fix);
  } else {
    sections.push('No errors or exceptions');
  }
  sections.push('');

  // Actual Result Section
  sections.push(`h3. Actual result`);
  if (aiResult.summary) {
    sections.push(aiResult.summary);
  }

  // Add critical error details in a panel
  if (data.errors.length > 0 && data.errors[0]) {
    sections.push('');
    sections.push(
      `{panel:title=Error Details|borderStyle=solid|borderColor=#ccc|titleBGColor=#F7D6C1|bgColor=#FFFFCE}`,
    );
    sections.push(`*Error:* {{${data.errors[0].message}}}`);
    sections.push(`{panel}`);
  }

  if (data.networkErrors.length > 0 && data.networkErrors[0]) {
    const topNetworkError = data.networkErrors[0];
    sections.push('');
    sections.push(
      `{panel:title=Network Error|borderStyle=solid|borderColor=#ccc|titleBGColor=#F7D6C1|bgColor=#FFFFCE}`,
    );
    sections.push(`*Request:* {{${topNetworkError.method}}} ${topNetworkError.url}`);
    sections.push(`*Status:* {color:red}${topNetworkError.status} ${topNetworkError.statusText}{color}`);
    sections.push(`{panel}`);
  }

  // Add Replay URL Section
  if (sessionId) {
    sections.push('');
    sections.push(`h3. Replay URL`);
    sections.push(`https://tubi-web-reel.vercel.app/replayer/${sessionId}`);
  }

  return sections.join('\n');
}
