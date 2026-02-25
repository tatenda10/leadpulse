import React, { useState } from 'react'
import { HiOutlineChatAlt } from 'react-icons/hi'
import './WelcomeMessage.css'

export const WelcomeMessage: React.FC = () => {
  const [message, setMessage] = useState(
    "Hello! 👋 Thanks for reaching out. I'm your assistant and I'm here to help. How can I assist you today?"
  )
  const [enabled, setEnabled] = useState(true)
  const [saved, setSaved] = useState(true)

  const handleChange = (value: string) => {
    setMessage(value)
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
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

      <div className="welcome-message-content">
        <div className="welcome-message-card">
          <div className="welcome-message-card-header">
            <label className="welcome-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
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
              onClick={handleSave}
              disabled={saved}
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
    </div>
  )
}
