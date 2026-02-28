import React from 'react'
import { HiOutlineArrowLeft, HiOutlineBell } from 'react-icons/hi'
import './Notifications.css'

type NotificationsProps = {
  onBack: () => void
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
  return (
    <div className="notifications-overview">
      <div className="notifications-header">
        <button
          type="button"
          className="notifications-back"
          onClick={onBack}
          aria-label="Back"
        >
          <HiOutlineArrowLeft size={20} />
        </button>
        <div className="notifications-header-text">
          <h1 className="notifications-title">Notifications</h1>
          <p className="notifications-desc">
            Alerts and updates from your account
          </p>
        </div>
      </div>
      <div className="notifications-container">
        <div className="notifications-content">
          <div className="notifications-empty">
            <HiOutlineBell size={48} className="notifications-empty-icon" />
            <p className="notifications-empty-title">No notifications yet</p>
            <span className="notifications-empty-hint">
              When you get alerts or updates, they’ll show up here.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
