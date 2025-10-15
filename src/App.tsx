import { Layout, Menu } from 'antd'
import { Link, Route, Routes, useLocation } from 'react-router-dom'

import logo from './assets/logo-reel.png'
import ReplayPage from './pages/replay'
import SessionsPage from './pages/sessions'
import RecorderTestPage from './pages/test'

import './App.css'

const { Header, Content, Footer } = Layout

export default function App() {
  const location = useLocation()
  
  // Determine active menu key based on current path
  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/replayer')) return 'replayer'
    if (path === '/test') return 'test'
    return 'home'
  }

  return (
    <Layout style={{ minHeight: '100vh', alignItems: 'center' }}>
      <Header style={{ position: 'fixed', zIndex: 1000, width: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '50px' }}>
          <img src={logo} alt="Web Reel Logo" style={{ width: '32px', height: '32px', marginRight: '12px', border: '2px solid white', borderRadius: '6px' }} />
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
              label: <Link to="/">Home</Link>,
            },
            {
              key: 'replayer',
              label: <Link to="/replayer/0">Replayer</Link>,
            },
            {
              key: 'test',
              label: <Link to="/test">Test</Link>,
            }
          ]}
        />
      </Header>
      
      <Content style={{ padding: '0 50px', marginTop: '64px', maxWidth: '1280px', width: '100%' }}>
        <div style={{ background: '#fff', padding: 24, minHeight: 'calc(100vh - 64px - 70px)' }}>
          <Routes>
            <Route path="/" element={<SessionsPage />} />
            <Route path="/replayer/:id" element={<ReplayPage />} />
            <Route path="/test" element={<RecorderTestPage />} />
          </Routes>
        </div>
      </Content>
      
      <Footer style={{ textAlign: 'center' }}>
        Web-Reel ©2025 - Session Recording & Replay Tool
      </Footer>
    </Layout>
  )
}
