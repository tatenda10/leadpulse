import React, { useState, useRef, useEffect } from 'react'
import {
  HiOutlineHome,
  HiOutlineChatAlt2,
  HiOutlineLightningBolt,
  HiOutlineSpeakerphone,
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineLogout,
} from 'react-icons/hi'
import { LuBot } from 'react-icons/lu'
import { useAuth } from '../contexts/AuthContext'
import './IconRail.css'
import type { PrimarySection } from './sections'

function getInitials(username: string | null | undefined): string {
  if (!username || !username.trim()) return '?'
  const raw = username.trim()
  const parts = raw.split(/[\s.@_-]+/).filter(Boolean)
  // For "Lead Pulse" / "leadpulse" use first word only so we show "LE" not "LP"
  const normalized = raw.toLowerCase().replace(/\s/g, '')
  if (normalized === 'leadpulse' && parts.length >= 1) {
    return parts[0].length >= 2 ? parts[0].slice(0, 2).toUpperCase() : parts[0].charAt(0).toUpperCase()
  }
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase().slice(0, 2)
  }
  if (parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return parts[0].charAt(0).toUpperCase()
}

type IconRailProps = {
  activeSection: PrimarySection
  onSelect: (section: PrimarySection) => void
  onLogout?: () => void
}

const ICON_SECTIONS: {
  key: PrimarySection
  label: string
  icon: React.ReactNode
}[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome size={20} /> },
  { key: 'conversations', label: 'Conversations', icon: <HiOutlineChatAlt2 size={20} /> },
  { key: 'chatbot', label: 'Chatbot', icon: <LuBot size={20} /> },
  { key: 'lead-intelligence', label: 'Lead Intelligence', icon: <HiOutlineLightningBolt size={20} /> },
  { key: 'campaigns', label: 'Campaigns', icon: <HiOutlineSpeakerphone size={20} /> },
  { key: 'contacts', label: 'Contacts', icon: <HiOutlineUsers size={20} /> },
  { key: 'analytics', label: 'Analytics', icon: <HiOutlineChartBar size={20} /> },
  { key: 'settings', label: 'Settings', icon: <HiOutlineCog size={20} /> },
]

export const IconRail: React.FC<IconRailProps> = ({ activeSection, onSelect, onLogout }) => {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const initials = getInitials(user?.username)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    onLogout?.()
  }

  return (
    <aside className="icon-rail">
      <div className="icon-rail-top">
        {ICON_SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`icon-rail-item ${activeSection === item.key ? 'active' : ''}`}
            title={item.label}
            onClick={() => onSelect(item.key)}
          >
            <span className="icon-rail-icon">{item.icon}</span>
          </button>
        ))}
      </div>
      <div className="icon-rail-bottom" ref={menuRef}>
        <button
          type="button"
          className="icon-rail-avatar"
          title="User menu"
          aria-label="User menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {initials}
        </button>
        {menuOpen && onLogout && (
          <div className="icon-rail-avatar-menu">
            <button type="button" className="icon-rail-menu-item" onClick={handleLogout}>
              <HiOutlineLogout size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

