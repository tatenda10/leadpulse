import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './layout/Layout.css'
import { Layout } from './layout/Layout'
import { Login } from './pages/Login'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function App() {
  const { isAuthenticated, logout } = useAuth()

  if (isAuthenticated) {
    return <Layout onLogout={logout} />
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

