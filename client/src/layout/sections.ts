export type PrimarySection =
  | 'dashboard'
  | 'conversations'
  | 'chatbot'
  | 'lead-intelligence'
  | 'campaigns'
  | 'contacts'
  | 'analytics'
  | 'settings'

export const DEFAULT_SUBMENU: Record<PrimarySection, string> = {
  dashboard: 'overview',
  conversations: 'all',
  chatbot: 'auto-replies',
  'lead-intelligence': 'scoring',
  campaigns: 'all-campaigns',
  contacts: 'all-contacts',
  analytics: 'conversation-trends',
  settings: 'general',
}

export const PRIMARY_SECTION_LABELS: Record<PrimarySection, string> = {
  dashboard: 'Dashboard',
  conversations: 'Conversations',
  chatbot: 'Chatbot Manager',
  'lead-intelligence': 'Lead Intelligence',
  campaigns: 'Campaigns / Ad Sources',
  contacts: 'Contacts',
  analytics: 'Analytics',
  settings: 'Settings',
}

