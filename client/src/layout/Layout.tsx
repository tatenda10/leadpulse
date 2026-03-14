import React, { useState, useEffect } from 'react'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import { useUnreadCount } from '../contexts/UnreadCountContext'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'
import { IconRail } from './IconRail'
import type { PrimarySection } from './sections'
import { PRIMARY_SECTION_LABELS, DEFAULT_SUBMENU } from './sections'
import { Dashboard } from '../pages/Dashboard'
import { ActivityFeed } from '../pages/ActivityFeed'
import { Performance } from '../pages/Performance'
import { AllChats } from '../pages/AllChats'
import { Unread } from '../pages/Unread'
import { AutoReplies } from '../pages/AutoReplies'
import { WelcomeMessage } from '../pages/WelcomeMessage'
import { KeywordTriggers } from '../pages/KeywordTriggers'
import { FallbackMessage } from '../pages/FallbackMessage'
import { BotStatus } from '../pages/BotStatus'
import { ScoringRules } from '../pages/ScoringRules'
import { HotLeadThreshold } from '../pages/HotLeadThreshold'
import { KeywordWeights } from '../pages/KeywordWeights'
import { LeadTags } from '../pages/LeadTags'
import { CrmPipeline } from '../pages/CrmPipeline'
import { CrmActions } from '../pages/CrmActions'
import { AllCampaigns } from '../pages/AllCampaigns'
import { FacebookSources } from '../pages/FacebookSources'
import { CampaignPerformance } from '../pages/CampaignPerformance'
import { AllContacts } from '../pages/AllContacts'
import { ContactSegments } from '../pages/ContactSegments'
import { ContactTags } from '../pages/ContactTags'
import { ContactNotes } from '../pages/ContactNotes'
import { ConversationTrends } from '../pages/ConversationTrends'
import { HotLeadTrends } from '../pages/HotLeadTrends'
import { BotPerformance } from '../pages/BotPerformance'
import { AgentPerformance } from '../pages/AgentPerformance'
import { ResponseTime } from '../pages/ResponseTime'
import { SettingsGeneral } from '../pages/SettingsGeneral'
import { SettingsBusinessProfile } from '../pages/SettingsBusinessProfile'
import { SettingsNotifications } from '../pages/SettingsNotifications'
import { SettingsWhatsApp } from '../pages/SettingsWhatsApp'
import { SettingsApiKeys } from '../pages/SettingsApiKeys'
import { SettingsWebhook } from '../pages/SettingsWebhook'
import { SettingsPhoneNumber } from '../pages/SettingsPhoneNumber'
import { SettingsTeam } from '../pages/SettingsTeam'
import { SettingsRoles } from '../pages/SettingsRoles'
import { SettingsPermissions } from '../pages/SettingsPermissions'
import { PrivacyPolicy } from '../pages/PrivacyPolicy'
import { Notifications } from '../pages/Notifications'
import { getEffectiveUnreadCount } from '../utils/conversationReadState'
import '../layout/Layout.css'
import '../layout/Sidebar.css'
import '../layout/TopNavBar.css'
import '../layout/IconRail.css'

type LayoutProps = {
  onLogout?: () => void
}

const LAST_LOCATION_KEY = 'leadpulse_last_location'

type SavedLocation = {
  section: PrimarySection
  subMenu: string
}

function readInitialLocation(): SavedLocation {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LAST_LOCATION_KEY) : null
    if (!raw) {
      return { section: 'dashboard', subMenu: DEFAULT_SUBMENU.dashboard }
    }
    const parsed = JSON.parse(raw) as { section?: PrimarySection; subMenu?: string }
    if (parsed.section && PRIMARY_SECTION_LABELS[parsed.section]) {
      return {
        section: parsed.section,
        subMenu: parsed.subMenu || DEFAULT_SUBMENU[parsed.section],
      }
    }
  } catch {
    // ignore bad data and fall back
  }
  return { section: 'dashboard', subMenu: DEFAULT_SUBMENU.dashboard }
}

type ConversationsResponse = {
  conversations: Array<{ id: string; unread?: number; lastMessageAt?: string | null }>
}

export const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const { token } = useAuth()
  const { unreadCount, setUnreadCount } = useUnreadCount()
  const initialLocation = readInitialLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [activeSection, setActiveSection] = useState<PrimarySection>(initialLocation.section)
  const [activeSubMenu, setActiveSubMenu] = useState<string>(initialLocation.subMenu)
  const [showNotificationsPage, setShowNotificationsPage] = useState(false)
  const [preferredConversationId, setPreferredConversationId] = useState<string | null>(null)

  // Fetch unread count for sidebar badge
  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiRequest<ConversationsResponse>('/conversations', { token })
      .then((res) => {
        if (!cancelled) {
          const total = (res.conversations || []).reduce(
            (s, c) => s + getEffectiveUnreadCount(c.id, c.unread || 0, c.lastMessageAt || null),
            0
          )
          setUnreadCount(total)
        }
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [token, setUnreadCount])

  // Redirect if saved submenu was removed (e.g. Lead Timeline, Click-to-WhatsApp)
  useEffect(() => {
    if (activeSection === 'lead-intelligence' && activeSubMenu === 'timeline') {
      setActiveSubMenu(DEFAULT_SUBMENU['lead-intelligence'])
    }
    if (activeSection === 'campaigns' && activeSubMenu === 'click-to-whatsapp') {
      setActiveSubMenu(DEFAULT_SUBMENU.campaigns)
    }
  }, [activeSection, activeSubMenu])

  // Persist current location so refresh returns to same page
  useEffect(() => {
    try {
      localStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({ section: activeSection, subMenu: activeSubMenu })
      )
    } catch {
      // ignore storage errors
    }
  }, [activeSection, activeSubMenu])

  const handleSubMenuSelect = (key: string) => {
    setActiveSubMenu(key)
  }

  const renderContent = () => {
    if (showNotificationsPage) {
      return (
        <Notifications onBack={() => setShowNotificationsPage(false)} />
      )
    }
    if (activeSection === 'dashboard') {
      if (activeSubMenu === 'activity') return <ActivityFeed />
      if (activeSubMenu === 'performance') return <Performance />
      return <Dashboard />
    }
    if (activeSection === 'conversations') {
      if (activeSubMenu === 'all') {
        return (
          <AllChats
            preferredChatId={preferredConversationId}
            onPreferredChatHandled={() => setPreferredConversationId(null)}
          />
        )
      }
      if (activeSubMenu === 'unread') {
        return (
          <Unread
            onOpenConversation={(conversationId) => {
              setPreferredConversationId(conversationId)
              setActiveSubMenu('all')
            }}
          />
        )
      }
    }
    if (activeSection === 'chatbot') {
      if (activeSubMenu === 'auto-replies') return <AutoReplies />
      if (activeSubMenu === 'welcome') return <WelcomeMessage />
      if (activeSubMenu === 'keywords') return <KeywordTriggers />
      if (activeSubMenu === 'fallback') return <FallbackMessage />
      if (activeSubMenu === 'status') return <BotStatus />
    }
    if (activeSection === 'lead-intelligence') {
      if (activeSubMenu === 'scoring') return <ScoringRules />
      if (activeSubMenu === 'threshold') return <HotLeadThreshold />
      if (activeSubMenu === 'weights') return <KeywordWeights />
      if (activeSubMenu === 'tags') return <LeadTags />
    }
    if (activeSection === 'crm') {
      if (activeSubMenu === 'pipeline') return <CrmPipeline />
      if (activeSubMenu === 'actions') return <CrmActions />
    }
    if (activeSection === 'campaigns') {
      if (activeSubMenu === 'all-campaigns') return <AllCampaigns />
      if (activeSubMenu === 'facebook') return <FacebookSources />
      if (activeSubMenu === 'performance') return <CampaignPerformance />
    }
    if (activeSection === 'contacts') {
      if (activeSubMenu === 'all-contacts') return <AllContacts />
      if (activeSubMenu === 'segments') return <ContactSegments />
      if (activeSubMenu === 'tags') return <ContactTags />
      if (activeSubMenu === 'notes') return <ContactNotes />
    }
    if (activeSection === 'analytics') {
      if (activeSubMenu === 'conversation-trends') return <ConversationTrends />
      if (activeSubMenu === 'hot-lead-trends') return <HotLeadTrends />
      if (activeSubMenu === 'bot-performance') return <BotPerformance />
      if (activeSubMenu === 'agent-performance') return <AgentPerformance />
      if (activeSubMenu === 'response-time') return <ResponseTime />
    }
    if (activeSection === 'settings') {
      if (activeSubMenu === 'general') return <SettingsGeneral />
      if (activeSubMenu === 'business-profile') return <SettingsBusinessProfile />
      if (activeSubMenu === 'notifications') return <SettingsNotifications />
      if (activeSubMenu === 'whatsapp') return <SettingsWhatsApp />
      if (activeSubMenu === 'api-keys') return <SettingsApiKeys />
      if (activeSubMenu === 'webhook') return <SettingsWebhook />
      if (activeSubMenu === 'phone-number') return <SettingsPhoneNumber />
      if (activeSubMenu === 'team') return <SettingsTeam />
      if (activeSubMenu === 'roles') return <SettingsRoles />
      if (activeSubMenu === 'permissions') return <SettingsPermissions />
      if (activeSubMenu === 'privacy-policy') return <PrivacyPolicy />
    }
    return <div className="placeholder-page">{PRIMARY_SECTION_LABELS[activeSection]} — Coming soon</div>
  }

  return (
    <div className={`dashboard-container ${sidebarHidden ? 'sidebar-hidden' : ''} ${sidebarOpen ? 'menu-open' : ''}`}>
      <IconRail
        activeSection={activeSection}
        onSelect={(section) => {
          setActiveSection(section)
          setActiveSubMenu(DEFAULT_SUBMENU[section])
        }}
        onLogout={onLogout}
      />
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        activeSection={activeSection}
        activeSubMenu={activeSubMenu}
        onSubMenuSelect={handleSubMenuSelect}
      />
      <main className="main-content">
        <TopNavBar
          onMenuClick={() => {
            if (sidebarOpen) {
              setSidebarOpen(false)
            } else {
              setSidebarOpen(true)
              setSidebarHidden(false)
            }
          }}
          activeSectionLabel={showNotificationsPage ? 'Notifications' : PRIMARY_SECTION_LABELS[activeSection]}
          onSidebarToggle={() => setSidebarHidden((prev) => !prev)}
          isSidebarHidden={sidebarHidden}
          liveChatsNow={unreadCount}
          hasNotifications={false}
          onNotificationsClick={() => setShowNotificationsPage((prev) => !prev)}
        />
        <div className="main-content-scrollable">{renderContent()}</div>
      </main>
    </div>
  )
}

