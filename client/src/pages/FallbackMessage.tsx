import React, { useState } from 'react'
import { HiOutlineExclamation } from 'react-icons/hi'
import './FallbackMessage.css'

export const FallbackMessage: React.FC = () => {
  const [message, setMessage] = useState(
    "I'm sorry, I didn't quite understand that. Could you please rephrase or type 'help' to see our options?"
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

      <div className="fallback-message-content">
        <div className="fallback-message-card">
          <div className="fallback-message-card-header">
            <label className="fallback-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
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
              onClick={handleSave}
              disabled={saved}
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
    </div>
  )
}
