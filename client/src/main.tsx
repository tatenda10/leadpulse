import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './layout/Layout.css'
import { Layout } from './layout/Layout'
import { Login } from './pages/Login'

const DEMO_USER = 'sysadmin'
const DEMO_PASSWORD = 'password123'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = (emailOrPhone: string, password: string): boolean => {
    if (emailOrPhone === DEMO_USER && password === DEMO_PASSWORD) {
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  if (isAuthenticated) {
    return <Layout onLogout={() => setIsAuthenticated(false)} />
  }

  return <Login onLogin={handleLogin} />
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

