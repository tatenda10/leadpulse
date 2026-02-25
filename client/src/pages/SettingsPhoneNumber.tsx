import React, { useState } from 'react'
import { HiOutlinePhone } from 'react-icons/hi'
import './Settings.css'

export const SettingsPhoneNumber: React.FC = () => {
  const [phone, setPhone] = useState('+263 77 123 4567')
  const [displayName, setDisplayName] = useState('LeadPulse Support')

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlinePhone size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Phone Number
        </h1>
        <p className="settings-desc">Your WhatsApp Business phone number for receiving messages.</p>
      </header>
      <div className="settings-card">
        <div className="settings-field">
          <label>Phone number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="settings-field">
          <label>Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <button type="button" className="settings-save-btn">Save</button>
      </div>
    </div>
  )
}
