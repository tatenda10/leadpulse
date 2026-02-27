import React, { useEffect, useState } from 'react'
import { HiOutlineExclamation } from 'react-icons/hi'
import './FallbackMessage.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type BotMessageResponse = {
  enabled: boolean
  message: string
}

export const FallbackMessage: React.FC = () => {
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
        const response = await apiRequest<BotMessageResponse>('/settings/fallback-message', { token })
        if (cancelled) return
        setMessage(response.message)
        setEnabled(response.enabled)
        setSaved(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load fallback message')
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
      await apiRequest<BotMessageResponse>('/settings/fallback-message', {
        method: 'PUT',
        body: { message, enabled },
        token,
      })
      setSaved(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save fallback message')
    }
  }

  return (
    <div className="fallback-message-page">
      <header className="fallback-message-header">
        <div>
          <h1 className="fallback-message-title">
            <HiOutlineExclamation size={24} />
            Fallback Message
          </h1>
          <p className="fallback-message-desc">
            This message is sent when the bot doesn't match any keyword or trigger.
          </p>
        </div>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="fallback-message-card"><p>Loading fallback message...</p></div>
      ) : (
      <div className="fallback-message-content">
        <div className="fallback-message-card">
          <div className="fallback-message-card-header">
            <label className="fallback-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleEnabledChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <span className="fallback-status">{enabled ? 'Active' : 'Paused'}</span>
          </div>

          <div className="fallback-message-field">
            <label>Fallback message</label>
            <textarea
              value={message}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Type your fallback message..."
              rows={4}
            />
            <span className="fallback-hint">
              Use this to politely guide customers when their message isn't understood.
            </span>
          </div>

          <div className="fallback-message-footer">
            <button
              type="button"
              className="fallback-save-btn"
              onClick={() => void handleSave()}
              disabled={saved || !message.trim()}
            >
              {saved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="fallback-preview-card">
          <h3 className="fallback-preview-title">Preview</h3>
          <p className="fallback-preview-label">As seen by customer:</p>
          <div className="fallback-preview-bubble">
            {message || <span className="fallback-preview-placeholder">Your message will appear here</span>}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
