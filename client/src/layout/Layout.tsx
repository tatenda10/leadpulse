import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'
import { IconRail } from './IconRail'
import type { PrimarySection } from './sections'
import { PRIMARY_SECTION_LABELS, DEFAULT_SUBMENU } from './sections'
import { Dashboard } from '../pages/Dashboard'
import { ActivityFeed } from '../pages/ActivityFeed'
import { Performance } from '../pages/Performance'
import { AllChats } from '../pages/AllChats'
import { HotLeads } from '../pages/HotLeads'
import { BotHandling } from '../pages/BotHandling'
import { HumanHandling } from '../pages/HumanHandling'
import { Unread } from '../pages/Unread'
import { AutoReplies } from '../pages/AutoReplies'
import { WelcomeMessage } from '../pages/WelcomeMessage'
import { KeywordTriggers } from '../pages/KeywordTriggers'
import { FallbackMessage } from '../pages/FallbackMessage'
import { BotStatus } from '../pages/BotStatus'
import { ScoringRules } from '../pages/ScoringRules'
import { HotLeadThreshold } from '../pages/HotLeadThreshold'
import { KeywordWeights } from '../pages/KeywordWeights'
import { LeadTimeline } from '../pages/LeadTimeline'
import { LeadTags } from '../pages/LeadTags'
import { AllCampaigns } from '../pages/AllCampaigns'
import { FacebookSources } from '../pages/FacebookSources'
import { ClickToWhatsAppLinks } from '../pages/ClickToWhatsAppLinks'
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
import '../layout/Layout.css'
import '../layout/Sidebar.css'
import '../layout/TopNavBar.css'
import '../layout/IconRail.css'

type LayoutProps = {
  onLogout?: () => void
}

export const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [activeSection, setActiveSection] = useState<PrimarySection>('dashboard')
  const [activeSubMenu, setActiveSubMenu] = useState<string>(DEFAULT_SUBMENU.dashboard)

  useEffect(() => {
    setActiveSubMenu(DEFAULT_SUBMENU[activeSection])
  }, [activeSection])

  const handleSubMenuSelect = (key: string) => {
    setActiveSubMenu(key)
  }

  const renderContent = () => {
    if (activeSection === 'dashboard') {
      if (activeSubMenu === 'activity') return <ActivityFeed />
      if (activeSubMenu === 'performance') return <Performance />
      return <Dashboard />
    }
    if (activeSection === 'conversations') {
      if (activeSubMenu === 'all') return <AllChats />
      if (activeSubMenu === 'hot') return <HotLeads />
      if (activeSubMenu === 'bot-handling') return <BotHandling />
      if (activeSubMenu === 'human-handling') return <HumanHandling />
      if (activeSubMenu === 'unread') return <Unread />
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
      if (activeSubMenu === 'timeline') return <LeadTimeline />
      if (activeSubMenu === 'tags') return <LeadTags />
    }
    if (activeSection === 'campaigns') {
      if (activeSubMenu === 'all-campaigns') return <AllCampaigns />
      if (activeSubMenu === 'facebook') return <FacebookSources />
      if (activeSubMenu === 'click-to-whatsapp') return <ClickToWhatsAppLinks />
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
    }
    return <div className="placeholder-page">{PRIMARY_SECTION_LABELS[activeSection]} — Coming soon</div>
  }

  return (
    <div className={`dashboard-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <IconRail activeSection={activeSection} onSelect={setActiveSection} onLogout={onLogout} />
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        activeSection={activeSection}
        activeSubMenu={activeSubMenu}
        onSubMenuSelect={handleSubMenuSelect}
      />
      <main className="main-content">
        <TopNavBar
          onMenuClick={() => setSidebarOpen(true)}
          activeSectionLabel={PRIMARY_SECTION_LABELS[activeSection]}
          onSidebarToggle={() => setSidebarHidden((prev) => !prev)}
          isSidebarHidden={sidebarHidden}
        />
        <div className="main-content-scrollable">{renderContent()}</div>
      </main>
    </div>
  )
}

