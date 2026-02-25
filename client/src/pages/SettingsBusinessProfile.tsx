import React, { useState } from 'react'
import { HiOutlineOfficeBuilding } from 'react-icons/hi'
import './Settings.css'

export const SettingsBusinessProfile: React.FC = () => {
  const [businessName, setBusinessName] = useState('LeadPulse')
  const [description, setDescription] = useState('Smart WhatsApp lead generation and chatbot platform.')
  const [email, setEmail] = useState('support@leadpulse.com')
  const [address, setAddress] = useState('')

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineOfficeBuilding size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Business Profile
        </h1>
        <p className="settings-desc">Your business information visible to customers.</p>
      </header>
      <div className="settings-card">
        <div className="settings-field">
          <label>Business name</label>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="settings-field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="settings-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="settings-field">
          <label>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
        </div>
        <button type="button" className="settings-save-btn">Save profile</button>
      </div>
    </div>
  )
}
