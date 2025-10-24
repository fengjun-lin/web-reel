'use client';

import { App, Layout, Menu } from 'antd';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const { Header, Content, Footer } = Layout;

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const getSelectedKey = () => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/replayer')) return 'replayer';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/test') return 'test';
    return 'home';
  };

  return (
    <App>
      <Layout style={{ minHeight: '100vh', alignItems: 'center' }}>
        <Header style={{ position: 'fixed', zIndex: 1000, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '50px' }}>
            <Image
              src="/logo-reel.png"
              alt="Web Reel Logo"
              width={32}
              height={32}
              style={{
                marginRight: '12px',
                border: '2px solid white',
                borderRadius: '6px',
              }}
            />
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>Web-Reel</span>
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            style={{ flex: 1 }}
            items={[
              {
                key: 'home',
                label: <Link href="/">Home</Link>,
              },
              {
                key: 'replayer',
                label: <Link href="/replayer/0">Replayer</Link>,
              },
              {
                key: 'settings',
                label: <Link href="/settings">Settings</Link>,
              },
              {
                key: 'test',
                label: <Link href="/test">Test</Link>,
              },
            ]}
          />
        </Header>

        <Content style={{ padding: '0 50px', marginTop: '64px', maxWidth: '1280px', width: '100%' }}>
          <div style={{ background: '#fff', padding: 24, minHeight: 'calc(100vh - 64px - 70px)' }}>{children}</div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>Web-Reel ©2025 - Session Recording & Replay Tool</Footer>
      </Layout>
    </App>
  );
}
