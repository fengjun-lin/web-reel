import { CopyOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, Empty, Pagination, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';

import type { HarEntry } from '@/types/har';

import './styles.css';

const { Text } = Typography;
const PAGE_SIZE = 20; // Show 20 requests per page

interface NetworkPanelProps {
  requests: HarEntry[];
  currentTime?: number;
  onSeekToTime?: (_timestamp: number) => void;
}

function getStatusColor(status: number): string {
  if ((status >= 200 && status < 300) || status === 304) {
    return 'success';
  } else if (status >= 400) {
    return 'error';
  } else if (status >= 300) {
    return 'warning';
  }
  return 'default';
}

function getEntryName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const index = pathname.lastIndexOf('/');
    return pathname.slice(index + 1) || pathname;
  } catch {
    return url;
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => message.success('Copied to clipboard'),
    () => message.error('Failed to copy'),
  );
}

interface RequestItemProps {
  entry: HarEntry;
  highlight: boolean;
  onDetailClick: (_entry: HarEntry) => void;
  onSeekToTime?: (_timestamp: number) => void;
}

function RequestItem({ entry, highlight, onDetailClick, onSeekToTime }: RequestItemProps) {
  const name = getEntryName(entry.request.url);
  const statusColor = getStatusColor(entry.response.status);
  const requestTime = Date.parse(entry.startedDateTime);

  return (
    <div className={`network-item ${highlight ? 'network-item-highlight' : ''}`} onClick={() => onDetailClick(entry)}>
      <div className="network-item-header">
        <Text strong className="network-item-name" title={entry.request.url}>
          {name}
        </Text>
        <Space size="small">
          {onSeekToTime && (
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onSeekToTime(requestTime);
              }}
            >
              Seek →
            </Button>
          )}
        </Space>
      </div>
      <Space size="middle" className="network-item-info">
        <Text type="secondary">
          <Text strong>Method:</Text> {entry.request.method}
        </Text>
        <Text type="secondary">
          <Tag color={statusColor}>{entry.response.status}</Tag>
          {entry.response.statusText}
        </Text>
        <Text type="secondary">
          <Text strong>Time:</Text> {entry.time.toFixed(0)}ms
        </Text>
      </Space>
    </div>
  );
}

interface RequestDetailProps {
  entry: HarEntry;
  visible: boolean;
  onClose: () => void;
}

function RequestDetail({ entry, visible, onClose }: RequestDetailProps) {
  return (
    <Drawer title="Request Details" width={720} placement="right" onClose={onClose} open={visible}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* General Information */}
        <div>
          <Typography.Title level={5}>General</Typography.Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="URL">
              <div style={{ wordBreak: 'break-all' }}>
                {entry.request.url}
                <CopyOutlined
                  style={{ marginLeft: 8, cursor: 'pointer', color: '#1890ff' }}
                  onClick={() => copyToClipboard(entry.request.url)}
                />
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Method">{entry.request.method}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(entry.response.status)}>{entry.response.status}</Tag>
              {entry.response.statusText}
            </Descriptions.Item>
            <Descriptions.Item label="Time">{entry.time.toFixed(2)} ms</Descriptions.Item>
            <Descriptions.Item label="Started">{new Date(entry.startedDateTime).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </div>

        {/* Request Headers */}
        <div>
          <Typography.Title level={5}>Request Headers</Typography.Title>
          {entry.request.headers.length > 0 ? (
            <div className="network-detail-headers">
              {entry.request.headers.map((header, index) => (
                <div key={index} className="network-detail-header-item">
                  <Text strong>{header.name}:</Text>
                  <Text style={{ marginLeft: 8 }}>{header.value}</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">No headers</Text>
          )}
        </div>

        {/* Request Body */}
        {entry.request.postData && (
          <div>
            <Typography.Title level={5}>
              Request Body
              <CopyOutlined
                style={{ marginLeft: 8, cursor: 'pointer', fontSize: 14 }}
                onClick={() => copyToClipboard(entry.request.postData?.text || '')}
              />
            </Typography.Title>
            <div className="network-detail-body">
              <pre>{entry.request.postData.text}</pre>
            </div>
          </div>
        )}

        {/* Response Headers */}
        <div>
          <Typography.Title level={5}>Response Headers</Typography.Title>
          {entry.response.headers.length > 0 ? (
            <div className="network-detail-headers">
              {entry.response.headers.map((header, index) => (
                <div key={index} className="network-detail-header-item">
                  <Text strong>{header.name}:</Text>
                  <Text style={{ marginLeft: 8 }}>{header.value}</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">No headers</Text>
          )}
        </div>

        {/* Response Body */}
        {entry.response.content && entry.response.content.text && (
          <div>
            <Typography.Title level={5}>
              Response Body
              <CopyOutlined
                style={{ marginLeft: 8, cursor: 'pointer', fontSize: 14 }}
                onClick={() => copyToClipboard(entry.response.content.text || '')}
              />
            </Typography.Title>
            <div className="network-detail-body">
              <pre>{entry.response.content.text}</pre>
            </div>
          </div>
        )}
      </Space>
    </Drawer>
  );
}

export default function NetworkPanel({ requests, currentTime, onSeekToTime }: NetworkPanelProps) {
  const [selectedEntry, setSelectedEntry] = useState<HarEntry | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort requests by time
  const sortedRequests = [...requests].sort((a, b) => Date.parse(a.startedDateTime) - Date.parse(b.startedDateTime));

  const handleDetailClick = (entry: HarEntry) => {
    setSelectedEntry(entry);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Find highlighted request based on current time
  const isHighlighted = (entry: HarEntry) => {
    if (!currentTime) return false;
    const requestTime = Date.parse(entry.startedDateTime);
    const timeDiff = Math.abs(requestTime - currentTime);
    return timeDiff < 2000; // Within 2 seconds
  };

  // Calculate paginated requests
  const totalRequests = sortedRequests.length;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  return (
    <div className="network-panel">
      {totalRequests > PAGE_SIZE && (
        <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={totalRequests}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={(total) => `Total ${total} requests`}
            size="small"
          />
        </div>
      )}

      <div className="network-panel-content">
        {sortedRequests.length === 0 ? (
          <Empty description="No network requests recorded" style={{ marginTop: 40 }} />
        ) : (
          paginatedRequests.map((entry, index) => (
            <RequestItem
              key={`${entry.startedDateTime}-${startIndex + index}`}
              entry={entry}
              highlight={isHighlighted(entry)}
              onDetailClick={handleDetailClick}
              onSeekToTime={onSeekToTime}
            />
          ))
        )}
      </div>

      {selectedEntry && <RequestDetail entry={selectedEntry} visible={drawerVisible} onClose={handleDrawerClose} />}
    </div>
  );
}
