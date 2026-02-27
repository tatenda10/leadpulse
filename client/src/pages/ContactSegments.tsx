import React, { useEffect, useState } from 'react'
import { HiOutlineViewGrid, HiOutlinePlus, HiOutlineX } from 'react-icons/hi'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Segment = {
  id: string
  name: string
  description: string
  criteria: string
  criteriaType: 'score' | 'last_contact' | 'tag' | 'source'
  criteriaValue: string
  contactCount: number
}

type SegmentsResponse = { segments: Segment[] }

type Toast = { show: boolean; type: 'success' | 'error'; message: string }

export const ContactSegments: React.FC = () => {
  const { token } = useAuth()
  const [segments, setSegments] = useState<Segment[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [viewSegment, setViewSegment] = useState<Segment | null>(null)
  const [toast, setToast] = useState<Toast>({ show: false, type: 'success', message: '' })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000)
  }

  useEffect(() => {
    let cancelled = false
    async function loadSegments() {
      if (!token) return
      try {
        const response = await apiRequest<SegmentsResponse>('/contacts/segments', { token })
        if (!cancelled) setSegments(response.segments)
      } catch (e) {
        if (!cancelled) showToast('error', e instanceof Error ? e.message : 'Failed to load segments')
      }
    }
    void loadSegments()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreateSegment = async (name: string, description: string, criteriaType: string, criteriaValue: string) => {
    if (!token) return
    try {
      await apiRequest('/contacts/segments', {
        method: 'POST',
        body: { name, description, criteriaType, criteriaValue },
        token,
      })
      const refreshed = await apiRequest<SegmentsResponse>('/contacts/segments', { token })
      setSegments(refreshed.segments)
      setModalOpen(false)
      showToast('success', 'Segment created successfully.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to create segment')
    }
  }

  return (
    <div className="contact-segments-page">
      <header className="contact-segments-header">
        <div>
          <h1 className="contact-segments-title">
            <HiOutlineViewGrid size={24} />
            Segments
          </h1>
          <p className="contact-segments-desc">
            Create segments to group contacts by score, source, tags, or behavior.
          </p>
        </div>
        <button type="button" className="contact-segments-add-btn" onClick={() => setModalOpen(true)}>
          <HiOutlinePlus size={18} />
          Create segment
        </button>
      </header>

      <div className="contact-segments-grid">
        {segments.map((segment) => (
          <div key={segment.id} className="segment-card">
            <h3 className="segment-name">{segment.name}</h3>
            <p className="segment-desc">{segment.description}</p>
            <div className="segment-criteria">
              <span className="criteria-label">Rule:</span>
              <span className="criteria-value">{segment.criteria}</span>
            </div>
            <div className="segment-footer">
              <span className="segment-count">{segment.contactCount} contacts</span>
              <button type="button" className="segment-view-btn" onClick={() => setViewSegment(segment)}>View</button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <CreateSegmentModal onClose={() => setModalOpen(false)} onCreate={handleCreateSegment} />
      )}

      {toast.show && (
        <div className={`segment-toast segment-toast-${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}

      {viewSegment && (
        <SegmentDetailsModal segment={viewSegment} onClose={() => setViewSegment(null)} />
      )}
    </div>
  )
}

type CreateSegmentModalProps = {
  onClose: () => void
  onCreate: (name: string, description: string, criteriaType: string, criteriaValue: string) => void
}

const CreateSegmentModal: React.FC<CreateSegmentModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [criteriaType, setCriteriaType] = useState('score')
  const [criteriaValue, setCriteriaValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && criteriaValue.trim()) {
      onCreate(name.trim(), description.trim(), criteriaType, criteriaValue.trim())
    }
  }

  return (
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="segment-modal-title">
        <div className="segment-modal-header">
          <h2 id="segment-modal-title" className="segment-modal-title">Create segment</h2>
          <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
            <HiOutlineX size={20} />
          </button>
        </div>
        <form id="create-segment-form" onSubmit={handleSubmit} className="segment-modal-body">
          <div className="segment-modal-field">
            <label htmlFor="segment-name">Name <span className="segment-field-required">*</span></label>
            <input id="segment-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot Leads" required />
          </div>
          <div className="segment-modal-field">
            <label htmlFor="segment-desc">Description</label>
            <textarea id="segment-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this segment" rows={2} />
          </div>
          <div className="segment-modal-field">
            <label htmlFor="segment-criteria-type">Rule type</label>
            <select id="segment-criteria-type" value={criteriaType} onChange={(e) => setCriteriaType(e.target.value)}>
              <option value="score">Score (&gt;=)</option>
              <option value="last_contact">Last contact (days)</option>
              <option value="tag">Tag</option>
              <option value="source">Source</option>
            </select>
          </div>
          <div className="segment-modal-field">
            <label htmlFor="segment-criteria-value">
              {criteriaType === 'score' ? 'Min score' : criteriaType === 'last_contact' ? 'Days' : criteriaType === 'tag' ? 'Tag name' : 'Source name'}
              {' '}<span className="segment-field-required">*</span>
            </label>
            <input
              id="segment-criteria-value"
              type="text"
              value={criteriaValue}
              onChange={(e) => setCriteriaValue(e.target.value)}
              placeholder={criteriaType === 'score' ? '70' : criteriaType === 'last_contact' ? '7' : criteriaType === 'tag' ? 'callback-requested' : 'Facebook'}
              required
            />
          </div>
        </form>
        <footer className="segment-modal-footer">
          <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="create-segment-form" className="segment-modal-btn segment-modal-btn-primary" disabled={!name.trim() || !criteriaValue.trim()}>
            Create segment
          </button>
        </footer>
      </div>
    </>
  )
}

type SegmentDetailsModalProps = {
  segment: Segment
  onClose: () => void
}

const SegmentDetailsModal: React.FC<SegmentDetailsModalProps> = ({ segment, onClose }) => {
  return (
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="segment-details-title">
        <div className="segment-modal-header">
          <h2 id="segment-details-title" className="segment-modal-title">Segment details</h2>
          <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
            <HiOutlineX size={20} />
          </button>
        </div>
        <div className="segment-modal-body">
          <div className="segment-modal-field">
            <label>Name</label>
            <div className="segment-detail-value">{segment.name}</div>
          </div>
          <div className="segment-modal-field">
            <label>Description</label>
            <div className="segment-detail-value">{segment.description || <span className="segment-detail-muted">No description</span>}</div>
          </div>
          <div className="segment-modal-field">
            <label>Rule</label>
            <div className="segment-detail-value">{segment.criteria}</div>
          </div>
          <div className="segment-modal-field">
            <label>Contacts in segment</label>
            <div className="segment-detail-value">{segment.contactCount}</div>
          </div>
        </div>
        <footer className="segment-modal-footer">
          <button type="button" className="segment-modal-btn segment-modal-btn-primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </>
  )
}
