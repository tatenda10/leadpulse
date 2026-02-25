import React, { useState } from 'react'
import { HiOutlineDatabase } from 'react-icons/hi'
import './Settings.css'

export const SettingsWebhook: React.FC = () => {
  const [url, setUrl] = useState('https://api.leadpulse.com/webhook/whatsapp')
  const [secret, setSecret] = useState('')
  const [enabled, setEnabled] = useState(true)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineDatabase size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Webhook
        </h1>
        <p className="settings-desc">Configure webhook URL for receiving WhatsApp events.</p>
      </header>
      <div className="settings-card">
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Webhook enabled</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-field">
          <label>Webhook URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="settings-field">
          <label>Signing secret (optional)</label>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Verify webhook signatures" />
        </div>
        <button type="button" className="settings-save-btn">Save webhook</button>
      </div>
    </div>
  )
}
