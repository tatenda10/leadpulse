import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineFire, HiOutlineChat, HiOutlineChip, HiOutlineUser } from 'react-icons/hi'
import './HotLeads.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Lead = {
  id: string
  contact: string
  phone: string
  score: number
  lastMessage: string
  lastMessageAt: string | null
  status: 'bot' | 'human'
  source: string
}

type ConversationsResponse = {
  conversations: Array<{
    id: string
    contact: string
    phone: string
    lastMessage: string
    lastMessageAt: string | null
    status: 'bot' | 'human'
    leadScore: number
    source: string | null
  }>
}

type ThresholdResponse = {
  warmThreshold: number
  hotThreshold: number
}

type UpdateConversationResponse = {
  conversation: {
    id: number | string
    status: 'bot' | 'human'
    segment: string | null
    lead_score: number | null
  }
}

function formatRelativeTime(value: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export const HotLeads: React.FC = () => {
  const { token } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hotThreshold, setHotThreshold] = useState(70)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!token) return
      setLoading(true)
      setError(null)

      try {
        const [threshold, convs] = await Promise.all([
          apiRequest<ThresholdResponse>('/settings/hot-lead-threshold', { token }),
          apiRequest<ConversationsResponse>('/conversations', { token }),
        ])

        if (cancelled) return

        setHotThreshold(threshold.hotThreshold)

        const nextLeads: Lead[] = convs.conversations
          .map((c) => ({
            id: c.id,
            contact: c.contact,
            phone: c.phone,
            score: Number(c.leadScore || 0),
            lastMessage: c.lastMessage || 'No messages yet',
            lastMessageAt: c.lastMessageAt,
            status: c.status,
            source: c.source || 'organic',
          }))
          .filter((c) => c.score >= threshold.hotThreshold)
          .sort((a, b) => b.score - a.score)

        setLeads(nextLeads)
        setSelectedId((current) => {
          if (current && nextLeads.some((l) => l.id === current)) return current
          return nextLeads[0]?.id ?? null
        })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load hot leads')
          setLeads([])
          setSelectedId(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [token])

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId])

  const handleToggleTakeover = async () => {
    if (!selectedLead || !token || updatingStatus) return
    const nextStatus: 'bot' | 'human' = selectedLead.status === 'bot' ? 'human' : 'bot'

    setUpdatingStatus(true)
    setError(null)

    try {
      const response = await apiRequest<UpdateConversationResponse>(`/conversations/${selectedLead.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
        token,
      })

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                status: response.conversation.status,
              }
            : lead
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update lead status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="hot-leads">
      <div className="hot-leads-header">
        <div className="hot-leads-title-wrap">
          <HiOutlineFire size={24} className="hot-leads-icon" />
          <div>
            <h2 className="hot-leads-title">Hot Leads</h2>
            <p className="hot-leads-subtitle">{leads.length} leads at or above threshold ({hotThreshold}+)</p>
          </div>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      <div className="hot-leads-grid">
        <div className="hot-leads-list">
          {loading ? (
            <div className="hot-leads-detail-empty"><p>Loading hot leads...</p></div>
          ) : leads.length === 0 ? (
            <div className="hot-leads-detail-empty">
              <HiOutlineFire size={40} className="empty-icon" />
              <p>No hot leads yet</p>
            </div>
          ) : (
            leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className={`hot-lead-card ${selectedId === lead.id ? 'active' : ''}`}
                onClick={() => setSelectedId(lead.id)}
              >
                <div className="hot-lead-score" style={{ color: lead.score >= hotThreshold + 10 ? '#ef4444' : '#f59e0b' }}>
                  {lead.score}
                </div>
                <div className="hot-lead-content">
                  <div className="hot-lead-contact">{lead.contact}</div>
                  <div className="hot-lead-preview">{lead.lastMessage}</div>
                  <div className="hot-lead-meta">
                    <span className="hot-lead-source">{lead.source}</span>
                    <span className="hot-lead-time">{formatRelativeTime(lead.lastMessageAt)}</span>
                  </div>
                </div>
                <span className={`hot-lead-status ${lead.status}`}>
                  {lead.status === 'bot' ? <HiOutlineChip size={14} /> : <HiOutlineUser size={14} />}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="hot-leads-detail">
          {selectedLead ? (
            <>
              <div className="hot-lead-detail-header">
                <div className="hot-lead-detail-contact">
                  <div className="hot-lead-detail-avatar">{selectedLead.contact.charAt(0)}</div>
                  <div>
                    <div className="hot-lead-detail-name">{selectedLead.contact}</div>
                    <div className="hot-lead-detail-phone">{selectedLead.phone}</div>
                  </div>
                </div>
                <div className="hot-lead-detail-score" style={{ color: selectedLead.score >= hotThreshold + 10 ? '#ef4444' : '#f59e0b' }}>
                  Score: {selectedLead.score}
                </div>
              </div>
              <div className="hot-lead-detail-info">
                <div className="hot-lead-detail-row">
                  <span className="hot-lead-detail-label">Status</span>
                  <span className="hot-lead-detail-value">{selectedLead.status === 'bot' ? 'Bot handling' : 'Human handling'}</span>
                </div>
                <div className="hot-lead-detail-row">
                  <span className="hot-lead-detail-label">Source</span>
                  <span className="hot-lead-detail-value">{selectedLead.source}</span>
                </div>
                <div className="hot-lead-detail-row">
                  <span className="hot-lead-detail-label">Last message</span>
                  <span className="hot-lead-detail-value">{selectedLead.lastMessage}</span>
                </div>
              </div>
              <div className="hot-lead-detail-actions">
                <button type="button" className="hot-lead-btn primary" disabled>
                  <HiOutlineChat size={16} />
                  Open chat
                </button>
                <button type="button" className="hot-lead-btn secondary" onClick={() => void handleToggleTakeover()} disabled={updatingStatus}>
                  <HiOutlineUser size={16} />
                  {updatingStatus ? 'Updating...' : selectedLead.status === 'bot' ? 'Take over' : 'Return to bot'}
                </button>
              </div>
            </>
          ) : (
            <div className="hot-leads-detail-empty">
              <HiOutlineFire size={40} className="empty-icon" />
              <p>Select a hot lead</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
