import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineClock, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './CrmActions.css'

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
  lastMessageAt: string | null
}

type ContactsResponse = { contacts: Contact[] }
type ConversationsResponse = {
  conversations: Array<{
    id: string
    phone: string
    leadScore: number
    source: string | null
    lastMessageAt: string | null
  }>
}

type CrmStage = 'new' | 'contacted' | 'meeting-set' | 'proposal' | 'won' | 'lost'
type NextActionType = 'none' | 'contact' | 'follow-up' | 'task'
type ActionTimeFilter = 'all' | 'overdue' | 'today' | 'upcoming'
type ActionTypeFilter = 'all' | Exclude<NextActionType, 'none'>

type CrmLead = {
  id: string
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

const CRM_STATE_KEY = 'leadpulse_crm_pipeline_state_v1'
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

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function toDateTimeLocalValue(date: Date): string {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return copy.toISOString().slice(0, 16)
}

function inferStage(score: number): CrmStage {
  if (score >= 70) return 'contacted'
  return 'new'
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

export const CrmActions: React.FC = () => {
  const { token } = useAuth()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [crmState, setCrmState] = useState<CrmStateMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<ActionTimeFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionTypeFilter>('all')
  const [snoozeLead, setSnoozeLead] = useState<CrmLead | null>(null)
  const [snoozeAtInput, setSnoozeAtInput] = useState('')
  const [snoozeNoteInput, setSnoozeNoteInput] = useState('')
  const [savingSnooze, setSavingSnooze] = useState(false)

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
            lastMessageAt: c.lastMessageAt,
          })
        }

        const merged: CrmLead[] = contactsRes.contacts.map((contact) => {
          const conversation = conversationByPhone.get(normalizePhone(contact.phone))
          return {
            id: contact.id,
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
    return { ...defaultState, ...saved }
  }

  const setLeadState = (leadId: string, nextState: CrmLeadState) => {
    setCrmState((prev) => ({ ...prev, [leadId]: nextState }))
  }

  const actionItems = useMemo(() => {
    const now = new Date()
    const q = searchQuery.trim().toLowerCase()
    return leads
      .map((lead) => ({ lead, state: getLeadState(lead) }))
      .filter(({ lead, state }) => {
        if (state.nextActionType === 'none' || !state.nextActionAt) return false
        if (actionFilter !== 'all' && state.nextActionType !== actionFilter) return false

        const dueAt = new Date(state.nextActionAt)
        const matchesTime =
          timeFilter === 'all' ||
          (timeFilter === 'overdue' && dueAt.getTime() < now.getTime() && !isSameDay(dueAt, now)) ||
          (timeFilter === 'today' && isSameDay(dueAt, now)) ||
          (timeFilter === 'upcoming' && dueAt.getTime() > now.getTime() && !isSameDay(dueAt, now))

        if (!matchesTime) return false
        if (!q) return true
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          lead.source.toLowerCase().includes(q) ||
          state.nextActionNote.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const left = a.state.nextActionAt ? new Date(a.state.nextActionAt).getTime() : 0
        const right = b.state.nextActionAt ? new Date(b.state.nextActionAt).getTime() : 0
        return left - right
      })
  }, [leads, crmState, searchQuery, timeFilter, actionFilter])

  const markDone = (lead: CrmLead) => {
    const state = getLeadState(lead)
    setLeadState(lead.id, {
      ...state,
      nextActionType: 'none',
      nextActionAt: null,
      nextActionNote: '',
    })
  }

  const openSnoozeModal = (lead: CrmLead) => {
    const state = getLeadState(lead)
    if (state.nextActionType === 'none') return
    setSnoozeLead(lead)
    setSnoozeAtInput(state.nextActionAt || toDateTimeLocalValue(new Date()))
    setSnoozeNoteInput(state.nextActionNote || '')
  }

  const clearSnoozeModal = () => {
    setSnoozeLead(null)
    setSnoozeAtInput('')
    setSnoozeNoteInput('')
  }

  const saveExactSnooze = async () => {
    if (!snoozeLead || !snoozeAtInput) return
    setSavingSnooze(true)
    try {
      const state = getLeadState(snoozeLead)
      if (state.nextActionType === 'none') return
      setLeadState(snoozeLead.id, {
        ...state,
        nextActionAt: snoozeAtInput,
        nextActionNote: snoozeNoteInput.trim(),
      })
      clearSnoozeModal()
    } finally {
      setSavingSnooze(false)
    }
  }

  return (
    <div className="crm-actions-page">
      <header className="crm-actions-header">
        <h1 className="crm-actions-title">CRM Actions</h1>
        <p className="crm-actions-desc">Manage follow-ups and tasks linked to your pipeline leads.</p>
      </header>

      <div className="crm-actions-filters">
        <div className="crm-actions-search-wrap">
          <HiOutlineSearch size={18} className="crm-actions-search-icon" />
          <input
            type="search"
            className="crm-actions-search-input"
            placeholder="Search lead, phone, source, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <label htmlFor="crm-actions-time-filter" className="crm-actions-filter-label">When</label>
        <select
          id="crm-actions-time-filter"
          className="crm-actions-filter-select"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as ActionTimeFilter)}
        >
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
        </select>

        <label htmlFor="crm-actions-type-filter" className="crm-actions-filter-label">Action</label>
        <select
          id="crm-actions-type-filter"
          className="crm-actions-filter-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ActionTypeFilter)}
        >
          <option value="all">All actions</option>
          <option value="contact">Contact this person</option>
          <option value="follow-up">Follow up</option>
          <option value="task">Task</option>
        </select>
      </div>

      <section className="crm-actions-list-wrap">
        {loading ? (
          <div className="crm-actions-empty">Loading actions...</div>
        ) : error ? (
          <div className="crm-actions-empty">{error}</div>
        ) : actionItems.length === 0 ? (
          <div className="crm-actions-empty">No actions found for this filter.</div>
        ) : (
          <div className="crm-actions-list">
            {actionItems.map(({ lead, state }) => (
              <article key={lead.id} className={`crm-actions-card crm-stage-${state.stage}`}>
                <div className="crm-actions-card-top">
                  <div>
                    <div className="crm-actions-lead-name">{lead.name}</div>
                    <div className="crm-actions-lead-meta">{lead.phone} - {lead.source}</div>
                  </div>
                  <span className={`crm-actions-stage-pill crm-stage-${state.stage}`}>{STAGE_LABELS[state.stage]}</span>
                </div>

                <div className="crm-actions-row">
                  <span className={`crm-actions-type-pill crm-actions-type-${state.nextActionType}`}>
                    {state.nextActionType === 'none' ? 'None' : NEXT_ACTION_LABELS[state.nextActionType]}
                  </span>
                  <span className="crm-actions-due">
                    <HiOutlineCalendar size={14} />
                    {state.nextActionAt ? new Date(state.nextActionAt).toLocaleString() : '--'}
                  </span>
                </div>

                {state.nextActionNote && <div className="crm-actions-note">{state.nextActionNote}</div>}
                <div className="crm-actions-lead-meta">Last contact: {lead.lastContact}</div>

                <div className="crm-actions-buttons">
                  <button type="button" className="crm-actions-btn-done" onClick={() => markDone(lead)}>
                    <HiOutlineCheckCircle size={14} />
                    Mark done
                  </button>
                  <button type="button" className="crm-actions-btn-snooze" onClick={() => openSnoozeModal(lead)}>
                    <HiOutlineClock size={14} />
                    Snooze
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {snoozeLead && (
        <>
          <div className="crm-actions-modal-overlay" onClick={clearSnoozeModal} aria-hidden="true" />
          <div className="crm-actions-modal" role="dialog" aria-modal="true" aria-labelledby="crm-snooze-title">
            <div className="crm-actions-modal-header">
              <h2 id="crm-snooze-title">Exact snooze - {snoozeLead.name}</h2>
              <button type="button" onClick={clearSnoozeModal} aria-label="Close">
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="crm-actions-modal-body">
              <label>
                Snooze until (exact date and time)
                <input
                  type="datetime-local"
                  value={snoozeAtInput}
                  onChange={(e) => setSnoozeAtInput(e.target.value)}
                />
              </label>
              <label>
                Snooze note
                <textarea
                  rows={3}
                  value={snoozeNoteInput}
                  onChange={(e) => setSnoozeNoteInput(e.target.value)}
                  placeholder="Add exact instructions for this snooze..."
                />
              </label>
            </div>
            <div className="crm-actions-modal-footer">
              <button type="button" className="secondary" onClick={clearSnoozeModal}>
                <HiOutlineX size={14} />
                Cancel
              </button>
              <button type="button" onClick={() => void saveExactSnooze()} disabled={!snoozeAtInput || savingSnooze}>
                <HiOutlineCalendar size={14} />
                {savingSnooze ? 'Saving...' : 'Save snooze'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

