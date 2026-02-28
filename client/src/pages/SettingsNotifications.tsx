import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineBell, HiOutlineX } from 'react-icons/hi'
import './Settings.css'

type ToastState = { message: string; type: 'success' | 'error' } | null

export const SettingsNotifications: React.FC = () => {
  const [hotLeadAlert, setHotLeadAlert] = useState(true)
  const [newChatAlert, setNewChatAlert] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)
  const [emailDigest, setEmailDigest] = useState(true)
  const [saved, setSaved] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)

  const handleToggle = (label: string, setter: (v: boolean) => void, value: boolean) => {
    setter(value)
    setSaved(false)
    setToast({ type: 'success', message: value ? `${label} on` : `${label} off` })
  }

  const handleSave = () => {
    setSaved(true)
    setToast({ type: 'success', message: 'Preferences saved' })
  }

  return (
    <div className="settings-page">
      {toast && (
        <SettingsNotificationsToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
            <input type="checkbox" checked={hotLeadAlert} onChange={(e) => handleToggle('Hot lead alert', setHotLeadAlert, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">New chat notification</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={newChatAlert} onChange={(e) => handleToggle('New chat notification', setNewChatAlert, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Daily digest (in-app)</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={dailyDigest} onChange={(e) => handleToggle('Daily digest (in-app)', setDailyDigest, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Email digest</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={emailDigest} onChange={(e) => handleToggle('Email digest', setEmailDigest, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
        <button type="button" className="settings-save-btn" onClick={handleSave} disabled={saved}>
          {saved ? 'Saved' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}

type SettingsNotificationsToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const SettingsNotificationsToast: React.FC<SettingsNotificationsToastProps> = ({ message, type, onClose }) => {
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
