import React, { useEffect, useState } from 'react'
import { HiOutlineChatAlt } from 'react-icons/hi'
import './WelcomeMessage.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type BotMessageResponse = {
  enabled: boolean
  message: string
}

export const WelcomeMessage: React.FC = () => {
  const { token } = useAuth()
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saved, setSaved] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<BotMessageResponse>('/settings/welcome-message', { token })
        if (cancelled) return
        setMessage(response.message)
        setEnabled(response.enabled)
        setSaved(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load welcome message')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadConfig()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleChange = (value: string) => {
    setMessage(value)
    setSaved(false)
  }

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!token) return
    try {
      await apiRequest<BotMessageResponse>('/settings/welcome-message', {
        method: 'PUT',
        body: { message, enabled },
        token,
      })
      setSaved(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save welcome message')
    }
  }

  return (
    <div className="welcome-message-page">
      <header className="welcome-message-header">
        <div>
          <h1 className="welcome-message-title">
            <HiOutlineChatAlt size={24} />
            Welcome Message
          </h1>
          <p className="welcome-message-desc">
            This message is sent automatically when a customer starts a new conversation.
          </p>
        </div>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="welcome-message-card"><p>Loading welcome message...</p></div>
      ) : (
      <div className="welcome-message-content">
        <div className="welcome-message-card">
          <div className="welcome-message-card-header">
            <label className="welcome-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleEnabledChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="welcome-status">{enabled ? 'Active' : 'Paused'}</span>
          </div>

          <div className="welcome-message-field">
            <label>Welcome message</label>
            <textarea
              value={message}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Type your welcome message..."
              rows={4}
            />
            <span className="welcome-hint">
              Use this to greet new customers and guide them. You can include emojis.
            </span>
          </div>

          <div className="welcome-message-footer">
            <button
              type="button"
              className="welcome-save-btn"
              onClick={() => void handleSave()}
              disabled={saved || !message.trim()}
            >
              {saved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="welcome-preview-card">
          <h3 className="welcome-preview-title">Preview</h3>
          <p className="welcome-preview-label">As seen by customer:</p>
          <div className="welcome-preview-bubble">
            {message || <span className="welcome-preview-placeholder">Your message will appear here</span>}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
