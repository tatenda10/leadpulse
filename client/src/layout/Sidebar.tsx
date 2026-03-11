import React from 'react'
import {
  HiOutlineViewGrid,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineChat,
  HiOutlineFire,
  HiOutlineChip,
  HiOutlineUser,
  HiOutlineInbox,
  HiOutlineReply,
  HiOutlineChatAlt,
  HiOutlineKey,
  HiOutlineExclamation,
  HiOutlineStatusOnline,
  HiOutlineCalculator,
  HiOutlineLightningBolt,
  HiOutlineTag,
  HiOutlineSpeakerphone,
  HiOutlineUserGroup,
  HiOutlineDocumentText,
  HiOutlineTrendingUp,
  HiOutlineCog,
  HiOutlineOfficeBuilding,
  HiOutlineBell,
  HiOutlineDatabase,
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
} from 'react-icons/hi'
import { SiFacebook, SiWhatsapp } from 'react-icons/si'
import { Logo } from './Logo'
import { useUnreadCount } from '../contexts/UnreadCountContext'
import './Sidebar.css'
import type { PrimarySection } from './sections'

type SidebarProps = {
  open: boolean
  setOpen: (open: boolean) => void
  activeSection: PrimarySection
  activeSubMenu: string
  onSubMenuSelect: (key: string) => void
}

type MenuItem = { key: string; label: string; icon: React.ReactNode }

const SIDEBAR_MENUS: Record<PrimarySection, MenuItem[]> = {
  dashboard: [
    { key: 'overview', label: 'Overview', icon: <HiOutlineViewGrid size={18} /> },
    { key: 'activity', label: 'Activity Feed', icon: <HiOutlineClock size={18} /> },
    { key: 'performance', label: 'Performance', icon: <HiOutlineChartBar size={18} /> },
  ],
  conversations: [
    { key: 'all', label: 'All Chats', icon: <HiOutlineChat size={18} /> },
    { key: 'unread', label: 'Unread', icon: <HiOutlineInbox size={18} /> },
  ],
  chatbot: [
    { key: 'auto-replies', label: 'Auto Replies', icon: <HiOutlineReply size={18} /> },
    { key: 'welcome', label: 'Welcome Message', icon: <HiOutlineChatAlt size={18} /> },
    { key: 'keywords', label: 'Keyword Triggers', icon: <HiOutlineKey size={18} /> },
    { key: 'fallback', label: 'Fallback Message', icon: <HiOutlineExclamation size={18} /> },
    { key: 'status', label: 'Bot Status', icon: <HiOutlineStatusOnline size={18} /> },
  ],
  'lead-intelligence': [
    { key: 'scoring', label: 'Scoring Rules', icon: <HiOutlineCalculator size={18} /> },
    { key: 'threshold', label: 'Hot Lead Threshold', icon: <HiOutlineLightningBolt size={18} /> },
    { key: 'weights', label: 'Keyword Weights', icon: <HiOutlineKey size={18} /> },
    { key: 'tags', label: 'Tags', icon: <HiOutlineTag size={18} /> },
  ],
  campaigns: [
    { key: 'all-campaigns', label: 'All Campaigns', icon: <HiOutlineSpeakerphone size={18} /> },
    { key: 'facebook', label: 'Facebook Sources', icon: <SiFacebook size={18} /> },
    { key: 'performance', label: 'Performance', icon: <HiOutlineChartBar size={18} /> },
  ],
  contacts: [
    { key: 'all-contacts', label: 'All Contacts', icon: <HiOutlineUserGroup size={18} /> },
    { key: 'segments', label: 'Segments', icon: <HiOutlineViewGrid size={18} /> },
    { key: 'tags', label: 'Tags', icon: <HiOutlineTag size={18} /> },
    { key: 'notes', label: 'Notes', icon: <HiOutlineDocumentText size={18} /> },
  ],
  analytics: [
    { key: 'conversation-trends', label: 'Conversation Trends', icon: <HiOutlineTrendingUp size={18} /> },
    { key: 'hot-lead-trends', label: 'Hot Lead Trends', icon: <HiOutlineFire size={18} /> },
    { key: 'bot-performance', label: 'Bot Performance', icon: <HiOutlineChip size={18} /> },
    { key: 'agent-performance', label: 'Agent Performance', icon: <HiOutlineUser size={18} /> },
    { key: 'response-time', label: 'Response Time', icon: <HiOutlineClock size={18} /> },
  ],
  settings: [
    { key: 'general', label: 'General', icon: <HiOutlineCog size={18} /> },
    { key: 'business-profile', label: 'Business Profile', icon: <HiOutlineOfficeBuilding size={18} /> },
    { key: 'notifications', label: 'Notifications', icon: <HiOutlineBell size={18} /> },
    { key: 'whatsapp', label: 'WhatsApp', icon: <SiWhatsapp size={18} /> },
    { key: 'api-keys', label: 'API Keys', icon: <HiOutlineKey size={18} /> },
    { key: 'webhook', label: 'Webhook', icon: <HiOutlineDatabase size={18} /> },
    { key: 'phone-number', label: 'Phone Number', icon: <HiOutlinePhone size={18} /> },
    { key: 'team', label: 'Team', icon: <HiOutlineUserGroup size={18} /> },
    { key: 'roles', label: 'Roles', icon: <HiOutlineShieldCheck size={18} /> },
    { key: 'permissions', label: 'Permissions', icon: <HiOutlineLockClosed size={18} /> },
    { key: 'privacy-policy', label: 'Privacy Policy', icon: <HiOutlineDocumentText size={18} /> },
  ],
}

export const Sidebar: React.FC<SidebarProps> = ({ open, setOpen, activeSection, activeSubMenu, onSubMenuSelect }) => {
  const { unreadCount } = useUnreadCount()

  const handleNavClick = (key: string) => {
    onSubMenuSelect(key)
    if (window.innerWidth < 1024) {
      setOpen(false)
    }
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <Logo />
          </div>
        </div>
        <nav className="sidebar-nav">
          {SIDEBAR_MENUS[activeSection].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-item ${activeSubMenu === item.key ? 'active' : ''}`}
              onClick={() => handleNavClick(item.key)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
              {item.key === 'unread' && unreadCount > 0 && (
                <span className="sidebar-nav-unread-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
    </>
  )
}

