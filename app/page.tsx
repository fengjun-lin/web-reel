'use client';

import { DeleteOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { SessionMetadata } from '@/types/session';

const { Title, Text, Link } = Typography;

export default function SessionsPage() {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Jira configuration from environment variables
  const jiraDomain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'web-reel.atlassian.net';

  // Load sessions from database
  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions?limit=100');
      const data = await response.json();

      if (data.success && data.sessions) {
        setSessions(data.sessions);
      } else {
        throw new Error(data.error || 'Failed to load sessions');
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      message.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: number) => {
    router.push(`/replayer/${id}`);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: 'Delete Session',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete session #${id}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      okButtonProps: {
        style: { outline: 'none' },
      },
      cancelButtonProps: {
        style: { outline: 'none' },
      },
      onOk: async () => {
        setDeleting(id);
        try {
          const response = await fetch(`/api/sessions/${id}`, {
            method: 'DELETE',
          });
          const data = await response.json();

          if (data.success) {
            message.success('Session deleted successfully');
            // Remove from local state
            setSessions((prev) => prev.filter((s) => s.id !== id));
          } else {
            throw new Error(data.error || 'Failed to delete session');
          }
        } catch (error) {
          console.error('Failed to delete session:', error);
          message.error('Failed to delete session');
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  // Extract unique platforms for filtering
  const platformFilters = Array.from(
    new Set(sessions.map((s) => s.platform).filter((p): p is string => p !== null)),
  ).map((platform) => ({
    text: platform,
    value: platform,
  }));

  const columns: TableColumnsType<SessionMetadata> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Jira',
      dataIndex: 'jira_id',
      key: 'jira_id',
      width: 150,
      render: (jira_id: string | null) => {
        if (!jira_id) {
          return <Text type="secondary">-</Text>;
        }
        const jiraUrl = `https://${jiraDomain}/browse/${jira_id}`;
        return (
          <Link href={jiraUrl} target="_blank" rel="noopener noreferrer">
            {jira_id}
          </Link>
        );
      },
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      filters: platformFilters,
      onFilter: (value, record) => record.platform === value,
      render: (platform: string | null) => {
        if (!platform) {
          return <Text type="secondary">-</Text>;
        }
        return <Tag color="blue">{platform}</Tag>;
      },
    },
    {
      title: 'Device ID',
      dataIndex: 'device_id',
      key: 'device_id',
      width: 150,
      render: (device_id: string | null) => device_id || <Text type="secondary">-</Text>,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
      render: (created_at: Date) => dayjs(created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id)}>
            View
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.currentTarget.blur();
              handleDelete(record.id);
            }}
            loading={deleting === record.id}
            style={{ outline: 'none' }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleTableChange: TableProps<SessionMetadata>['onChange'] = (pagination, filters, sorter) => {
    // Table change handler for any future custom logic
    console.log('Table params:', pagination, filters, sorter);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>Session Management</Title>
        <Text type="secondary">View and manage recorded sessions from the database</Text>
      </div>

      <Alert
        message="Session Recording"
        description="Sessions are automatically uploaded to the database when recorded. Use the table below to view, replay, and manage sessions."
        type="info"
        showIcon
      />

      <Card title="Sessions">
        <Table<SessionMetadata>
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            pageSize: 10,
            hideOnSinglePage: sessions.length <= 10,
            showTotal: (total) => `Total ${total} session${total !== 1 ? 's' : ''}`,
            showSizeChanger: false,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  );
}
