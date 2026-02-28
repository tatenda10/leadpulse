import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineOfficeBuilding, HiOutlineX } from 'react-icons/hi'
import './Settings.css'

type ToastState = { message: string; type: 'success' | 'error' } | null

export const SettingsBusinessProfile: React.FC = () => {
  const [businessName, setBusinessName] = useState('LeadPulse')
  const [description, setDescription] = useState('Smart WhatsApp lead generation and chatbot platform.')
  const [email, setEmail] = useState('support@leadpulse.com')
  const [address, setAddress] = useState('')
  const [saved, setSaved] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)

  const handleSave = () => {
    setToast({ type: 'success', message: 'Profile saved' })
    setSaved(true)
  }

  return (
    <div className="settings-page">
      {toast && (
        <SettingsBusinessProfileToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
          <input value={businessName} onChange={(e) => { setBusinessName(e.target.value); setSaved(false) }} />
        </div>
        <div className="settings-field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false) }} />
        </div>
        <div className="settings-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false) }} />
        </div>
        <div className="settings-field">
          <label>Address</label>
          <input value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false) }} placeholder="Optional" />
        </div>
        <button type="button" className="settings-save-btn" onClick={handleSave} disabled={saved}>
          {saved ? 'Saved' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}

type SettingsBusinessProfileToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const SettingsBusinessProfileToast: React.FC<SettingsBusinessProfileToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`settings-general-toast settings-general-toast-${type}`} role="status">
      <span className="settings-general-toast-message">{message}</span>
      <button type="button" className="settings-general-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}
