import React from 'react'
import { HiOutlineBell } from 'react-icons/hi'
import { Logo } from './Logo'
import './TopNavBar.css'

type TopNavBarProps = {
  onMenuClick: () => void
  activeSectionLabel: string
  onSidebarToggle: () => void
  isSidebarHidden: boolean
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onMenuClick,
  activeSectionLabel,
  onSidebarToggle,
  isSidebarHidden,
}) => {
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Open sidebar"
          onClick={onMenuClick}
        >
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
          <span className="menu-icon-line" />
        </button>
        <div className="top-nav-mobile-logo">
          <Logo size="small" />
          <span className="top-nav-mobile-title">LeadPulse</span>
        </div>
        <span className="top-nav-section-label">{activeSectionLabel}</span>
      </div>
      <div className="top-nav-center">
        <div className="top-nav-search-wrapper">
          <input
            className="top-nav-search"
            type="search"
            placeholder="Search chats, contacts, campaigns..."
          />
        </div>
      </div>
      <div className="top-nav-right">
        <button type="button" className="sidebar-toggle-button" onClick={onSidebarToggle}>
          {isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
        </button>
        <div className="live-chats-pill">
          <span className="live-dot" />
          <span className="live-text">3 live chats</span>
        </div>
        <button type="button" className="icon-button" aria-label="Notifications">
          <span className="notification-dot" />
          <HiOutlineBell size={20} className="notification-icon" />
        </button>
      </div>
    </header>
  )
}

