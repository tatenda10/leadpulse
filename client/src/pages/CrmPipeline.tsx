import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineCalendar, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './CrmPipeline.css'

type Contact = {
  id: string
  name: string
  phone: string
  score: number
  source: string
  lastContact: string
}

type Conversation = {
  id: string
  phone: string
  leadScore: number
  source: string | null
  status: 'bot' | 'human'
  segment: string | null
  lastMessageAt: string | null
}

type ContactsResponse = { contacts: Contact[] }
type ConversationsResponse = {
  conversations: Array<{
    id: string
    phone: string
    leadScore: number
    source: string | null
    status: 'bot' | 'human'
    segment: string | null
    lastMessageAt: string | null
  }>
}

type CrmStage = 'new' | 'contacted' | 'meeting-set' | 'proposal' | 'won' | 'lost'
type StageFilter = 'all' | CrmStage
type SourceFilter = 'all' | string

type CrmLead = {
  id: string
  conversationId: string | null
  name: string
  phone: string
  source: string
  score: number
  lastContact: string
}

type CrmLeadState = {
  stage: CrmStage
  meetingAt: string | null
  meetingNote: string
}

type CrmStateMap = Record<string, CrmLeadState>

const STAGE_ORDER: CrmStage[] = ['new', 'contacted', 'meeting-set', 'proposal', 'won', 'lost']
const STAGE_LABELS: Record<CrmStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  'meeting-set': 'Meeting Set',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}
const CRM_STATE_KEY = 'leadpulse_crm_pipeline_state_v1'

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function readCrmState(): CrmStateMap {
  try {
    const raw = localStorage.getItem(CRM_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CrmStateMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function inferStage(score: number): CrmStage {
  if (score >= 70) return 'contacted'
  return 'new'
}

export const CrmPipeline: React.FC = () => {
  const { token } = useAuth()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [crmState, setCrmState] = useState<CrmStateMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const [meetingLead, setMeetingLead] = useState<CrmLead | null>(null)
  const [meetingAtInput, setMeetingAtInput] = useState('')
  const [meetingNoteInput, setMeetingNoteInput] = useState('')
  const [savingMeeting, setSavingMeeting] = useState(false)

  useEffect(() => {
    setCrmState(readCrmState())
  }, [])

  useEffect(() => {
    localStorage.setItem(CRM_STATE_KEY, JSON.stringify(crmState))
  }, [crmState])

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [contactsRes, conversationsRes] = await Promise.all([
          apiRequest<ContactsResponse>('/contacts', { token }),
          apiRequest<ConversationsResponse>('/conversations', { token }),
        ])
        if (cancelled) return

        const conversationByPhone = new Map<string, Conversation>()
        for (const c of conversationsRes.conversations) {
          conversationByPhone.set(normalizePhone(c.phone), {
            id: c.id,
            phone: c.phone,
            leadScore: c.leadScore,
            source: c.source,
            status: c.status,
            segment: c.segment,
            lastMessageAt: c.lastMessageAt,
          })
        }

        const merged: CrmLead[] = contactsRes.contacts.map((contact) => {
          const conversation = conversationByPhone.get(normalizePhone(contact.phone))
          return {
            id: contact.id,
            conversationId: conversation?.id ?? null,
            name: contact.name,
            phone: contact.phone,
            source: conversation?.source || contact.source || 'Unknown',
            score: conversation?.leadScore ?? contact.score ?? 0,
            lastContact: contact.lastContact || '--',
          }
        })

        setLeads(merged)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load CRM leads')
          setLeads([])
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

  const getLeadState = (lead: CrmLead): CrmLeadState => {
    const saved = crmState[lead.id]
    if (saved) return saved
    return { stage: inferStage(lead.score), meetingAt: null, meetingNote: '' }
  }

  const setLeadState = (leadId: string, nextState: CrmLeadState) => {
    setCrmState((prev) => ({ ...prev, [leadId]: nextState }))
  }

  const sourceOptions = useMemo(() => {
    const values = new Set<string>()
    for (const lead of leads) {
      if (lead.source) values.add(lead.source)
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return leads.filter((lead) => {
      const state = getLeadState(lead)
      const stageMatch = stageFilter === 'all' || state.stage === stageFilter
      const sourceMatch = sourceFilter === 'all' || lead.source === sourceFilter
      const textMatch =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.source.toLowerCase().includes(q)
      return stageMatch && sourceMatch && textMatch
    })
  }, [leads, searchQuery, stageFilter, sourceFilter, crmState])

  const leadsByStage = useMemo(() => {
    const groups: Record<CrmStage, CrmLead[]> = {
      new: [],
      contacted: [],
      'meeting-set': [],
      proposal: [],
      won: [],
      lost: [],
    }
    for (const lead of filteredLeads) {
      groups[getLeadState(lead).stage].push(lead)
    }
    return groups
  }, [filteredLeads, crmState])

  const openMeetingModal = (lead: CrmLead) => {
    const state = getLeadState(lead)
    setMeetingLead(lead)
    setMeetingAtInput(state.meetingAt || '')
    setMeetingNoteInput(state.meetingNote || '')
  }

  const saveMeeting = async () => {
    if (!meetingLead || !meetingAtInput) return
    setSavingMeeting(true)
    try {
      const next = {
        stage: 'meeting-set' as CrmStage,
        meetingAt: meetingAtInput,
        meetingNote: meetingNoteInput.trim(),
      }
      setLeadState(meetingLead.id, next)

      // Best-effort: mark this conversation as human-managed when meeting is scheduled.
      if (meetingLead.conversationId && token) {
        await apiRequest(`/conversations/${meetingLead.conversationId}`, {
          method: 'PATCH',
          body: { status: 'human' },
          token,
        })
      }

      setMeetingLead(null)
      setMeetingAtInput('')
      setMeetingNoteInput('')
    } finally {
      setSavingMeeting(false)
    }
  }

  return (
    <div className="crm-page">
      <header className="crm-header">
        <div>
          <h1 className="crm-title">CRM Pipeline</h1>
          <p className="crm-desc">Track every lead and move customers through your sales journey.</p>
        </div>
      </header>

      <div className="crm-search-container">
        <div className="crm-search-wrap">
          <HiOutlineSearch size={18} className="crm-search-icon" />
          <input
            type="search"
            className="crm-search-input"
            placeholder="Search lead, phone, or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="crm-filters">
          <label className="crm-filter-label" htmlFor="crm-stage-filter">Stage</label>
          <select
            id="crm-stage-filter"
            className={`crm-filter-select ${stageFilter === 'all' ? '' : `crm-stage-${stageFilter}`}`.trim()}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
          >
            <option value="all">All</option>
            {STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
          <label className="crm-filter-label" htmlFor="crm-source-filter">Source</label>
          <select
            id="crm-source-filter"
            className="crm-filter-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="crm-board-container">
        {loading ? (
          <div className="crm-empty">Loading CRM leads...</div>
        ) : error ? (
          <div className="crm-empty">{error}</div>
        ) : (
          <div className="crm-board">
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className={`crm-column crm-stage-${stage}`}>
                <div className="crm-column-header">
                  <span>{STAGE_LABELS[stage]}</span>
                  <span className="crm-column-count">{leadsByStage[stage].length}</span>
                </div>
                <div className="crm-column-body">
                  {leadsByStage[stage].length === 0 ? (
                    <div className="crm-column-empty">No leads</div>
                  ) : (
                    leadsByStage[stage].map((lead) => {
                      const state = getLeadState(lead)
                      return (
                        <article key={lead.id} className={`crm-lead-card crm-stage-${state.stage}`}>
                          <div className="crm-lead-name">{lead.name}</div>
                          <span className={`crm-lead-stage-pill crm-stage-${state.stage}`}>{STAGE_LABELS[state.stage]}</span>
                          <div className="crm-lead-meta">{lead.phone}</div>
                          <div className="crm-lead-meta">Source: {lead.source}</div>
                          <div className="crm-lead-meta">Score: {lead.score}</div>
                          <div className="crm-lead-meta">Last contact: {lead.lastContact}</div>
                          {state.meetingAt && (
                            <div className="crm-lead-meeting">
                              <HiOutlineCalendar size={14} />
                              {new Date(state.meetingAt).toLocaleString()}
                            </div>
                          )}
                          <div className="crm-lead-actions">
                            <select
                              value={state.stage}
                              onChange={(e) =>
                                setLeadState(lead.id, {
                                  ...state,
                                  stage: e.target.value as CrmStage,
                                })
                              }
                            >
                              {STAGE_ORDER.map((option) => (
                                <option key={option} value={option}>
                                  {STAGE_LABELS[option]}
                                </option>
                              ))}
                            </select>
                            <button type="button" onClick={() => openMeetingModal(lead)}>
                              Set meeting
                            </button>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {meetingLead && (
        <>
          <div className="crm-modal-overlay" onClick={() => setMeetingLead(null)} aria-hidden="true" />
          <div className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="crm-meeting-title">
            <div className="crm-modal-header">
              <h2 id="crm-meeting-title">Set meeting — {meetingLead.name}</h2>
              <button type="button" onClick={() => setMeetingLead(null)} aria-label="Close">
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="crm-modal-body">
              <label>
                Meeting date and time
                <input
                  type="datetime-local"
                  value={meetingAtInput}
                  onChange={(e) => setMeetingAtInput(e.target.value)}
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={3}
                  value={meetingNoteInput}
                  onChange={(e) => setMeetingNoteInput(e.target.value)}
                  placeholder="Agenda, objections, next steps..."
                />
              </label>
            </div>
            <div className="crm-modal-footer">
              <button type="button" className="secondary" onClick={() => setMeetingLead(null)}>
                Cancel
              </button>
              <button type="button" onClick={() => void saveMeeting()} disabled={!meetingAtInput || savingMeeting}>
                {savingMeeting ? 'Saving...' : 'Save meeting'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

