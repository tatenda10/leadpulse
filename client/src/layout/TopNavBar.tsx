import React from 'react'
import { HiOutlineBell, HiOutlineChat } from 'react-icons/hi'
import { Logo } from './Logo'
import './TopNavBar.css'

type TopNavBarProps = {
  onMenuClick: () => void
  activeSectionLabel: string
  onSidebarToggle: () => void
  isSidebarHidden: boolean
  liveChatsNow?: number
  hasNotifications?: boolean
  onNotificationsClick?: () => void
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onMenuClick,
  activeSectionLabel,
  onSidebarToggle,
  isSidebarHidden,
  liveChatsNow = 0,
  hasNotifications = false,
  onNotificationsClick,
}) => {
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Toggle sidebar"
          onClick={onMenuClick}
        >
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
        </button>
        <div className="top-nav-mobile-logo">
          <Logo size="small" />
        </div>
        <span className="top-nav-section-label">{activeSectionLabel}</span>
      </div>
      <div className="top-nav-right">
        <button type="button" className="sidebar-toggle-button" onClick={onSidebarToggle}>
          {isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
        </button>
         <button
          type="button"
          className="icon-button live-chats-icon-button"
          aria-label={`${liveChatsNow} live chat${liveChatsNow === 1 ? '' : 's'}`}
        >
          <HiOutlineChat size={20} className="live-chats-icon" />
          {liveChatsNow > 0 && (
            <span className="live-chats-counter">{liveChatsNow > 99 ? '99+' : liveChatsNow}</span>
          )}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
          onClick={onNotificationsClick}
        >
          {hasNotifications && <span className="notification-dot" />}
          <HiOutlineBell size={20} className="notification-icon" />
        </button>
      </div>
    </header>
  )
}

