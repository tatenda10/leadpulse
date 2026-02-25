import React, { useState } from 'react'
import { HiOutlineCog } from 'react-icons/hi'
import './Settings.css'

export const SettingsGeneral: React.FC = () => {
  const [businessName, setBusinessName] = useState('LeadPulse')
  const [timezone, setTimezone] = useState('Africa/Harare')
  const [language, setLanguage] = useState('en')

  return (
    <div className="settings-page">
      <header className="settings-header">
<h1 className="settings-title">
          <HiOutlineCog size={24} />
          General
        </h1>
        <p className="settings-desc">Basic app and account settings.</p>
      </header>
      <div className="settings-card">
        <div className="settings-section">
          <h3 className="settings-section-title">Account</h3>
          <div className="settings-field">
            <label>Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
        </div>
        <div className="settings-section">
          <h3 className="settings-section-title">Regional</h3>
          <div className="settings-field">
            <label>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="Africa/Harare">Africa/Harare</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
        <button type="button" className="settings-save-btn">Save changes</button>
      </div>
    </div>
  )
}
