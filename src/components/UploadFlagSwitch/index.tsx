import { Descriptions, Space, Switch, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { APP_MAP } from '@/constants';
import { httpApi } from '@/services/api';

interface UploadFlagSwitchProps {
  appId: number;
  deviceId?: string;
}

export default function UploadFlagSwitch({ appId, deviceId }: UploadFlagSwitchProps) {
  const [flag, setFlag] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const loadFlag = useCallback(async () => {
    if (!deviceId) return;

    try {
      const response = await httpApi.getFlag({ appId, deviceId });
      if (response.errNo === 0) {
        setFlag(!!response.data.uploadFlag);
      } else {
        setFlag(undefined);
        message.error(`Failed to load upload flag: ${response.errStr}`);
      }
    } catch (error) {
      console.error('Failed to load flag:', error);
      setFlag(undefined);
    }
  }, [appId, deviceId]);

  // Load current flag status from server
  useEffect(() => {
    if (appId && deviceId) {
      loadFlag();
    } else {
      setFlag(undefined);
    }
  }, [appId, deviceId, loadFlag]);

  const handleToggle = async () => {
    if (!deviceId || flag === undefined) return;

    setLoading(true);
    try {
      const newFlag = !flag;
      const response = await httpApi.setFlag({
        appId,
        deviceId,
        uploadFlag: newFlag ? 1 : 0,
      });

      if (response.errNo === 0) {
        setFlag(newFlag);
        message.success('Upload flag updated successfully');
      } else {
        message.error(`Failed to update flag: ${response.errStr}`);
      }
    } catch (error) {
      console.error('Failed to toggle flag:', error);
      message.error(`Failed to update flag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const hasFlag = deviceId && flag !== undefined;
  const appName = APP_MAP.get(appId) || 'Unknown';

  return (
    <Descriptions bordered size="small" column={3}>
      <Descriptions.Item label="App">{appName}</Descriptions.Item>
      <Descriptions.Item label="Device ID">{deviceId || '-'}</Descriptions.Item>
      <Descriptions.Item label="Upload Flag">
        <Space>
          {hasFlag ? String(flag) : '-'}
          {hasFlag && <Switch size="small" checked={flag} loading={loading} onChange={handleToggle} />}
        </Space>
      </Descriptions.Item>
    </Descriptions>
  );
}
