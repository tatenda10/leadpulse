import React, { useState } from 'react'
import { Logo } from '../layout/Logo'
import './Login.css'

const DEMO_USER = 'sysadmin'
const DEMO_PASSWORD = 'password123'

type LoginProps = {
  onLogin: (emailOrPhone: string, password: string) => boolean
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = onLogin(emailOrPhone.trim(), password)
    if (!ok) {
      setError('Invalid email/phone or password. Please try again.')
    }
  }

  const simulateLogin = () => {
    setEmailOrPhone(DEMO_USER)
    setPassword(DEMO_PASSWORD)
    setError('')
    onLogin(DEMO_USER, DEMO_PASSWORD)
  }

  return (
    <div className="login-page">
      <div className="login-main">
      <div className="login-left">
        <h1 className="login-left-title">Hey There!</h1>
        <p className="login-left-tagline">
          begin your amazing journey with us
        </p>
      </div>

      <div className="login-right">
        <div className="login-right-inner">
          <div className="login-logo">
            <Logo size="default" />
            <span className="login-logo-text">LeadPulse</span>
          </div>
          <p className="login-welcome">Welcome back, good to see you again!</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email or Phone</label>
              <input
                id="login-email"
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="Enter your email or phone number"
                autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="login-submit-btn">
              Log In
            </button>
          </form>

          <p className="login-simulate">
            <button type="button" className="login-simulate-btn" onClick={simulateLogin}>
              Simulate login (sysadmin / password123)
            </button>
          </p>
        </div>
      </div>
      </div>

      <footer className="login-footer">
        <span className="login-footer-brand">LeadPulse</span>
        <span className="login-footer-copy">© All rights reserved</span>
      </footer>
    </div>
  )
}
