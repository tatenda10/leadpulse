import React, { useState } from 'react'
import { SiWhatsapp } from 'react-icons/si'
import { HiOutlineCheckCircle } from 'react-icons/hi'
import './Settings.css'

export const SettingsWhatsApp: React.FC = () => {
  const [connected] = useState(true)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <SiWhatsapp size={24} style={{ verticalAlign: 'middle', marginRight: 8, color: '#25d366' }} />
          WhatsApp
        </h1>
        <p className="settings-desc">Connect and manage your WhatsApp Business account.</p>
      </header>
      <div className="settings-card">
        <div className="settings-section">
          <h3 className="settings-section-title">Connection status</h3>
          {connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineCheckCircle size={24} style={{ color: '#22c55e' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Connected</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Not connected. Connect your WhatsApp Business account to receive messages.</p>
          )}
        </div>
        <button type="button" className="settings-save-btn">
          {connected ? 'Reconnect' : 'Connect WhatsApp'}
        </button>
      </div>
    </div>
  )
}
