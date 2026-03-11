import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './layout/Layout.css'
import { Layout } from './layout/Layout'
import { Login } from './pages/Login'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UnreadCountProvider } from './contexts/UnreadCountContext'

const PUBLIC_PATHS = new Set(['/privacy-policy'])

function getCurrentPath() {
  return window.location.pathname.toLowerCase()
}

function App() {
  const { isAuthenticated, logout } = useAuth()
  const [pathname, setPathname] = useState(() => getCurrentPath())

  useEffect(() => {
    const handleLocationChange = () => setPathname(getCurrentPath())
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  if (PUBLIC_PATHS.has(pathname)) {
    return <PrivacyPolicy />
  }

  if (isAuthenticated) {
    return (
      <UnreadCountProvider>
        <Layout onLogout={logout} />
      </UnreadCountProvider>
    )
  }

  return <Login />
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

