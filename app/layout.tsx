import { ConfigProvider, App as AntdApp } from 'antd';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import 'antd/dist/reset.css';

import '../src/index.css';
import AppLayout from './AppLayout';

export const metadata: Metadata = {
  title: 'Web Reel - Session Recording & Replay Tool',
  description: 'Session Recording and Replay Tool',
  icons: {
    icon: '/icon-reel.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConfigProvider>
          <AntdApp>
            <AppLayout>{children}</AppLayout>
          </AntdApp>
        </ConfigProvider>
      </body>
    </html>
  );
}
