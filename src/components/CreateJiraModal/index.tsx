/**
 * Create Jira Ticket Modal Component
 * Allows users to create Jira tickets with session data context
 */

import { useState } from 'react'
import { Modal, Form, Input, Button, message, Space, Typography } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { createJiraTicket } from '@/services/jira'
import { isJiraConfigured } from '@/config/jira'

const { TextArea } = Input
const { Text, Link } = Typography

interface CreateJiraModalProps {
  visible: boolean
  onClose: () => void
  sessionId?: string
}

export default function CreateJiraModal({
  visible,
  onClose,
  sessionId,
}: CreateJiraModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [createdTicket, setCreatedTicket] = useState<{
    issueKey: string
    issueUrl: string
  } | null>(null)

  // Check if Jira is configured
  const jiraConfigured = isJiraConfigured()

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const result = await createJiraTicket({
        summary: values.summary,
        description: values.description,
      })

      if (result.success && result.issueKey && result.issueUrl) {
        message.success(`Jira ticket ${result.issueKey} created successfully!`)
        setCreatedTicket({
          issueKey: result.issueKey,
          issueUrl: result.issueUrl,
        })
        // Don't close immediately to show success message
      } else {
        message.error(`Failed to create Jira ticket: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to create Jira ticket:', error)
      message.error('Failed to create Jira ticket. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    form.resetFields()
    setCreatedTicket(null)
    onClose()
  }

  // Initialize form with default values
  const initialValues = {
    summary: `Bug Report: Session ${sessionId || 'Unknown'}`,
    description: `This bug was found during session replay analysis.

Session ID: ${sessionId || 'Unknown'}

Steps to Reproduce:
1. [Add steps here]
2. [Add more steps]

Expected Behavior:
[Describe what should happen]

Actual Behavior:
[Describe what actually happens]

Additional Information:
- Browser: [Browser name and version]
- Environment: [Development/Staging/Production]
- Timestamp: ${new Date().toISOString()}`,
  }

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
              disabled={!jiraConfigured}
            >
              Create Ticket
            </Button>
          </Space>
        )
      }
    >
      {!jiraConfigured && (
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="warning">
              <ExclamationCircleOutlined /> Jira is not configured. Please set up your Jira
              credentials in <code>.env.local</code> file.
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Required environment variables: VITE_JIRA_API_KEY, VITE_JIRA_DOMAIN,
              VITE_JIRA_USER_EMAIL, VITE_JIRA_PROJECT_KEY
            </Text>
          </Space>
        </div>
      )}

      {createdTicket ? (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircleOutlined
              style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }}
            />
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
          disabled={!jiraConfigured}
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
            label="Description"
            rules={[
              { required: true, message: 'Please enter a description' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <TextArea
              rows={12}
              placeholder="Detailed description of the issue including steps to reproduce"
            />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            This will create a Bug ticket in the WR project. You can edit the fields above
            before creating the ticket.
          </Text>
        </Form>
      )}
    </Modal>
  )
}

