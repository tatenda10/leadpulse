import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineCog, HiOutlineX } from 'react-icons/hi'
import './Settings.css'

type ToastState = { message: string; type: 'success' | 'error' } | null

export const SettingsGeneral: React.FC = () => {
  const [businessName, setBusinessName] = useState('LeadPulse')
  const [timezone, setTimezone] = useState('Africa/Harare')
  const [language, setLanguage] = useState('en')
  const [saved, setSaved] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)

  const handleSave = () => {
    setToast({ type: 'success', message: 'Changes saved' })
    setSaved(true)
  }

  return (
    <div className="settings-page">
      {toast && (
        <SettingsGeneralToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
              onChange={(e) => {
                setBusinessName(e.target.value)
                setSaved(false)
              }}
            />
          </div>
        </div>
        <div className="settings-section">
          <h3 className="settings-section-title">Regional</h3>
          <div className="settings-field">
            <label>Timezone</label>
            <select value={timezone} onChange={(e) => { setTimezone(e.target.value); setSaved(false) }}>
              <option value="Africa/Harare">Africa/Harare</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Language</label>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); setSaved(false) }}>
              <option value="en">English</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
        <button type="button" className="settings-save-btn" onClick={handleSave} disabled={saved}>
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

type SettingsGeneralToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const SettingsGeneralToast: React.FC<SettingsGeneralToastProps> = ({ message, type, onClose }) => {
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
