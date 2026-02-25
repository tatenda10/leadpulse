import React, { useState } from 'react'
import { HiOutlineBell } from 'react-icons/hi'
import './Settings.css'

export const SettingsNotifications: React.FC = () => {
  const [hotLeadAlert, setHotLeadAlert] = useState(true)
  const [newChatAlert, setNewChatAlert] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)
  const [emailDigest, setEmailDigest] = useState(true)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineBell size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Notifications
        </h1>
        <p className="settings-desc">Configure how you receive alerts and updates.</p>
      </header>
      <div className="settings-card">
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Hot lead alert</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={hotLeadAlert} onChange={(e) => setHotLeadAlert(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">New chat notification</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={newChatAlert} onChange={(e) => setNewChatAlert(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Daily digest (in-app)</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={dailyDigest} onChange={(e) => setDailyDigest(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Email digest</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={emailDigest} onChange={(e) => setEmailDigest(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <button type="button" className="settings-save-btn">Save preferences</button>
      </div>
    </div>
  )
}
