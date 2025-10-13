import { Layout, Menu } from 'antd'
import { Link, Route, Routes, useLocation } from 'react-router-dom'

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
    return 'home'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ position: 'fixed', zIndex: 1000, width: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '50px' }}>
          Web-Reel
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: 'home',
              label: <Link to="/">Home</Link>,
            },
            {
              key: 'replayer',
              label: <Link to="/replayer/0">Replayer</Link>,
            },
          ]}
        />
      </Header>
      
      <Content style={{ padding: '0 50px', marginTop: 64 }}>
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
