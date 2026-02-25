import React, { useState } from 'react'
import { HiOutlineFire, HiOutlineChat, HiOutlineChip, HiOutlineUser } from 'react-icons/hi'
import './HotLeads.css'

type HotLead = {
  id: string
  contact: string
  phone: string
  score: number
  lastMessage: string
  time: string
  status: 'bot' | 'human'
  source: string
}

const MOCK_HOT_LEADS: HotLead[] = [
  { id: '1', contact: 'John Mbanga', phone: '+263 77 123 4567', score: 92, lastMessage: 'What is your best price?', time: '2m ago', status: 'human', source: 'Facebook Ads' },
  { id: '2', contact: '+263 78 555 1234', phone: '+263 78 555 1234', score: 88, lastMessage: 'I want to buy today', time: '8m ago', status: 'bot', source: 'WhatsApp Link' },
  { id: '3', contact: 'Grace Mutasa', phone: '+263 71 333 4444', score: 85, lastMessage: 'Send me the catalogue', time: '18m ago', status: 'bot', source: 'Facebook Ads' },
  { id: '4', contact: 'David Sibanda', phone: '+263 77 999 8888', score: 82, lastMessage: 'Ready to place order', time: '25m ago', status: 'bot', source: 'Organic' },
  { id: '5', contact: 'Lisa Ndlovu', phone: '+263 71 444 5555', score: 78, lastMessage: 'When can I get a quote?', time: '32m ago', status: 'human', source: 'Facebook Ads' },
]

export const HotLeads: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_HOT_LEADS[0]?.id)

  return (
    <div className="hot-leads">
      <div className="hot-leads-header">
        <div className="hot-leads-title-wrap">
          <HiOutlineFire size={24} className="hot-leads-icon" />
          <div>
            <h2 className="hot-leads-title">Hot Leads</h2>
            <p className="hot-leads-subtitle">{MOCK_HOT_LEADS.length} high-intent leads need attention</p>
          </div>
        </div>
      </div>
      <div className="hot-leads-grid">
        <div className="hot-leads-list">
          {MOCK_HOT_LEADS.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className={`hot-lead-card ${selectedId === lead.id ? 'active' : ''}`}
              onClick={() => setSelectedId(lead.id)}
            >
              <div className="hot-lead-score" style={{ color: lead.score >= 85 ? '#ef4444' : '#f59e0b' }}>
                {lead.score}
              </div>
              <div className="hot-lead-content">
                <div className="hot-lead-contact">{lead.contact}</div>
                <div className="hot-lead-preview">{lead.lastMessage}</div>
                <div className="hot-lead-meta">
                  <span className="hot-lead-source">{lead.source}</span>
                  <span className="hot-lead-time">{lead.time}</span>
                </div>
              </div>
              <span className={`hot-lead-status ${lead.status}`}>
                {lead.status === 'bot' ? <HiOutlineChip size={14} /> : <HiOutlineUser size={14} />}
              </span>
            </button>
          ))}
        </div>
        <div className="hot-leads-detail">
          {selectedId ? (
            (() => {
              const lead = MOCK_HOT_LEADS.find((l) => l.id === selectedId)
              if (!lead) return null
              return (
                <>
                  <div className="hot-lead-detail-header">
                    <div className="hot-lead-detail-contact">
                      <div className="hot-lead-detail-avatar">{lead.contact.charAt(0)}</div>
                      <div>
                        <div className="hot-lead-detail-name">{lead.contact}</div>
                        <div className="hot-lead-detail-phone">{lead.phone}</div>
                      </div>
                    </div>
                    <div className="hot-lead-detail-score" style={{ color: lead.score >= 85 ? '#ef4444' : '#f59e0b' }}>
                      Score: {lead.score}
                    </div>
                  </div>
                  <div className="hot-lead-detail-info">
                    <div className="hot-lead-detail-row">
                      <span className="hot-lead-detail-label">Status</span>
                      <span className="hot-lead-detail-value">{lead.status === 'bot' ? 'Bot handling' : 'Human handling'}</span>
                    </div>
                    <div className="hot-lead-detail-row">
                      <span className="hot-lead-detail-label">Source</span>
                      <span className="hot-lead-detail-value">{lead.source}</span>
                    </div>
                    <div className="hot-lead-detail-row">
                      <span className="hot-lead-detail-label">Last message</span>
                      <span className="hot-lead-detail-value">{lead.lastMessage}</span>
                    </div>
                  </div>
                  <div className="hot-lead-detail-actions">
                    <button type="button" className="hot-lead-btn primary">
                      <HiOutlineChat size={16} />
                      Open chat
                    </button>
                    {lead.status === 'bot' && (
                      <button type="button" className="hot-lead-btn secondary">
                        <HiOutlineUser size={16} />
                        Take over
                      </button>
                    )}
                  </div>
                </>
              )
            })()
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
