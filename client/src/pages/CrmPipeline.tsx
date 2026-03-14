import React, { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineCalendar,
  HiOutlinePhone,
  HiOutlineAnnotation,
  HiOutlineVideoCamera,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi'
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
type NextActionType = 'none' | 'contact' | 'follow-up' | 'task'

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
  nextActionType: NextActionType
  nextActionAt: string | null
  nextActionNote: string
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
const NEXT_ACTION_LABELS: Record<Exclude<NextActionType, 'none'>, string> = {
  contact: 'Contact this person',
  'follow-up': 'Follow up',
  task: 'Task',
}
const CRM_STATE_KEY = 'leadpulse_crm_pipeline_state_v1'

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function toDateTimeLocalValue(date: Date): string {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return copy.toISOString().slice(0, 16)
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
  const [actionLead, setActionLead] = useState<CrmLead | null>(null)
  const [actionTypeInput, setActionTypeInput] = useState<Exclude<NextActionType, 'none'>>('contact')
  const [actionAtInput, setActionAtInput] = useState('')
  const [actionNoteInput, setActionNoteInput] = useState('')
  const [savingAction, setSavingAction] = useState(false)
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null)
  const [movedLeadId, setMovedLeadId] = useState<string | null>(null)

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
    const defaultState: CrmLeadState = {
      stage: inferStage(lead.score),
      meetingAt: null,
      meetingNote: '',
      nextActionType: 'none',
      nextActionAt: null,
      nextActionNote: '',
    }
    if (!saved) return defaultState
    return {
      ...defaultState,
      ...saved,
    }
  }

  const setLeadState = (leadId: string, nextState: CrmLeadState) => {
    setCrmState((prev) => ({ ...prev, [leadId]: nextState }))
  }

  const moveLeadToStage = (leadId: string, nextStage: CrmStage) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    const state = getLeadState(lead)
    setLeadState(leadId, { ...state, stage: nextStage })
    setMovedLeadId(leadId)
    window.setTimeout(() => {
      setMovedLeadId((current) => (current === leadId ? null : current))
    }, 400)
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

  const openActionModal = (lead: CrmLead) => {
    const state = getLeadState(lead)
    setActionLead(lead)
    setActionTypeInput(state.nextActionType === 'none' ? 'contact' : state.nextActionType)
    setActionAtInput(state.nextActionAt || '')
    setActionNoteInput(state.nextActionNote || '')
  }

  const clearActionModal = () => {
    setActionLead(null)
    setActionTypeInput('contact')
    setActionAtInput('')
    setActionNoteInput('')
  }

  const saveNextAction = async () => {
    if (!actionLead || !actionAtInput) return
    setSavingAction(true)
    try {
      const state = getLeadState(actionLead)
      setLeadState(actionLead.id, {
        ...state,
        stage: state.stage === 'new' ? 'contacted' : state.stage,
        nextActionType: actionTypeInput,
        nextActionAt: actionAtInput,
        nextActionNote: actionNoteInput.trim(),
      })
      clearActionModal()
    } finally {
      setSavingAction(false)
    }
  }

  const markContactNow = (lead: CrmLead) => {
    const state = getLeadState(lead)
    setLeadState(lead.id, {
      ...state,
      stage: state.stage === 'new' ? 'contacted' : state.stage,
      nextActionType: 'contact',
      nextActionAt: toDateTimeLocalValue(new Date()),
      nextActionNote: state.nextActionNote,
    })
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
              <div
                key={stage}
                className={`crm-column crm-stage-${stage}`}
                onDragOver={(e) => {
                  e.preventDefault()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const leadId = e.dataTransfer.getData('text/plain')
                  if (!leadId) {
                    setDraggingLeadId(null)
                    return
                  }
                  moveLeadToStage(leadId, stage)
                  setDraggingLeadId(null)
                  const lead = leads.find((l) => l.id === leadId)
                  if (!lead) return
                  if (stage === 'meeting-set') {
                    const state = getLeadState(lead)
                    setMeetingLead(lead)
                    setMeetingAtInput(state.meetingAt || '')
                    setMeetingNoteInput(state.meetingNote || '')
                  } else if (stage === 'contacted') {
                    openActionModal(lead)
                  }
                }}
              >
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
                        <article
                          key={lead.id}
                          className={`crm-lead-card crm-stage-${state.stage} ${
                            draggingLeadId === lead.id ? 'crm-lead-card-dragging' : ''
                          } ${movedLeadId === lead.id ? 'crm-lead-card-moved' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', lead.id)
                            setDraggingLeadId(lead.id)
                          }}
                          onDragEnd={() => setDraggingLeadId(null)}
                        >
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
                          {state.nextActionType !== 'none' && state.nextActionAt && (
                            <div className="crm-lead-next-action">
                              <span className={`crm-next-action-pill crm-next-action-${state.nextActionType}`}>
                                {NEXT_ACTION_LABELS[state.nextActionType]}
                              </span>
                              <span>{new Date(state.nextActionAt).toLocaleString()}</span>
                            </div>
                          )}
                          {state.nextActionType !== 'none' && state.nextActionNote && (
                            <div className="crm-lead-next-note">{state.nextActionNote}</div>
                          )}
                          <div className="crm-lead-actions">
                            <button
                              type="button"
                              className="crm-btn-icon crm-btn-contact"
                              onClick={() => markContactNow(lead)}
                              aria-label="Mark as contacted now"
                              title="Contact now"
                            >
                              <HiOutlinePhone size={18} />
                            </button>
                            <button
                              type="button"
                              className="crm-btn-icon crm-btn-plan"
                              onClick={() => openActionModal(lead)}
                              aria-label="Plan next action"
                              title="Plan action"
                            >
                              <HiOutlineAnnotation size={18} />
                            </button>
                            <button
                              type="button"
                              className="crm-btn-icon crm-btn-meeting"
                              onClick={() => openMeetingModal(lead)}
                              aria-label="Set meeting"
                              title="Set meeting"
                            >
                              <HiOutlineVideoCamera size={18} />
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

      {actionLead && (
        <>
          <div className="crm-modal-overlay" onClick={clearActionModal} aria-hidden="true" />
          <div className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="crm-action-title">
            <div className="crm-modal-header">
              <h2 id="crm-action-title">Plan next action — {actionLead.name}</h2>
              <button type="button" onClick={clearActionModal} aria-label="Close">
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="crm-modal-body">
              <label>
                Action type
                <select
                  value={actionTypeInput}
                  onChange={(e) => setActionTypeInput(e.target.value as Exclude<NextActionType, 'none'>)}
                >
                  <option value="contact">Contact this person</option>
                  <option value="follow-up">Follow up</option>
                  <option value="task">Task</option>
                </select>
              </label>
              <label>
                Due date and time
                <input
                  type="datetime-local"
                  value={actionAtInput}
                  onChange={(e) => setActionAtInput(e.target.value)}
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={3}
                  value={actionNoteInput}
                  onChange={(e) => setActionNoteInput(e.target.value)}
                  placeholder="What should happen on this follow-up?"
                />
              </label>
            </div>
            <div className="crm-modal-footer">
              <button type="button" className="secondary" onClick={clearActionModal}>
                Cancel
              </button>
              <button type="button" onClick={() => void saveNextAction()} disabled={!actionAtInput || savingAction}>
                {savingAction ? 'Saving...' : 'Save action'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

