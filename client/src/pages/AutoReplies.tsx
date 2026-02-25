import React, { useState } from 'react'
import { HiOutlineReply, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './AutoReplies.css'
import './ContactSegments.css'

type AutoReplyRule = {
  id: string
  trigger: string
  reply: string
  enabled: boolean
  matchType: 'contains' | 'exact'
}

const MOCK_RULES: AutoReplyRule[] = [
  { id: '1', trigger: 'price, cost, how much', reply: 'Thanks for asking! Our prices start from $99. Would you like me to send you our full catalogue?', enabled: true, matchType: 'contains' },
  { id: '2', trigger: 'hello, hi', reply: 'Hello! Welcome to LeadPulse. How can we help you today?', enabled: true, matchType: 'contains' },
  { id: '3', trigger: 'catalogue', reply: 'Here\'s our product catalogue: [link]. Let me know if you have any questions!', enabled: true, matchType: 'contains' },
  { id: '4', trigger: 'contact', reply: 'You can reach us on WhatsApp or call +263 77 123 4567. We\'re here Mon–Fri, 8am–5pm.', enabled: false, matchType: 'contains' },
]

export const AutoReplies: React.FC = () => {
  const [rules, setRules] = useState<AutoReplyRule[]>(MOCK_RULES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    setEditingId(null)
  }

  const saveRule = (id: string, trigger: string, reply: string, matchType: 'contains' | 'exact') => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, trigger, reply, matchType } : r
      )
    )
    setEditingId(null)
  }

  const addRule = (trigger: string, reply: string, matchType: 'contains' | 'exact') => {
    const newRule: AutoReplyRule = {
      id: String(Date.now()),
      trigger,
      reply,
      enabled: true,
      matchType,
    }
    setRules((prev) => [newRule, ...prev])
    setIsAdding(false)
  }

  return (
    <div className="auto-replies-page">
      <header className="auto-replies-header">
        <div>
          <h1 className="auto-replies-title">
            <HiOutlineReply size={24} />
            Auto Replies
          </h1>
          <p className="auto-replies-desc">
            Configure automatic replies when customers send specific keywords or phrases.
          </p>
        </div>
        <button
          type="button"
          className="auto-replies-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add rule
        </button>
      </header>

      {isAdding && (
        <AddAutoReplyModal
          onClose={() => setIsAdding(false)}
          onSave={(trigger, reply, matchType) => addRule(trigger, reply, matchType)}
        />
      )}

      <div className="auto-replies-list">
        {rules.map((rule) => (
          <AutoReplyCard
            key={rule.id}
            rule={rule}
            isEditing={editingId === rule.id}
            onToggle={() => toggleRule(rule.id)}
            onEdit={() => setEditingId(rule.id)}
            onDelete={() => deleteRule(rule.id)}
            onSave={(trigger, reply, matchType) => saveRule(rule.id, trigger, reply, matchType)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>

      {rules.length === 0 && !isAdding && (
        <div className="auto-replies-empty">
          <HiOutlineReply size={48} className="empty-icon" />
          <p>No auto reply rules yet</p>
          <span className="empty-hint">Add a rule to let your bot respond automatically to keywords</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first rule
          </button>
        </div>
      )}
    </div>
  )
}

type AddAutoReplyModalProps = {
  onClose: () => void
  onSave: (trigger: string, reply: string, matchType: 'contains' | 'exact') => void
}

const AddAutoReplyModal: React.FC<AddAutoReplyModalProps> = ({ onClose, onSave }) => {
  const [trigger, setTrigger] = useState('')
  const [reply, setReply] = useState('')
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains')

  const canSave = trigger.trim() && reply.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(trigger.trim(), reply.trim(), matchType)
  }

  return (
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-autoreply-modal-title">
        <div className="segment-modal-header">
          <h2 id="add-autoreply-modal-title" className="segment-modal-title">Add rule</h2>
          <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
            <HiOutlineX size={20} />
          </button>
        </div>
        <form id="add-autoreply-form" onSubmit={handleSubmit} className="segment-modal-body">
          <div className="segment-modal-field">
            <label htmlFor="auto-reply-trigger">
              Trigger keywords (comma-separated) <span className="segment-field-required">*</span>
            </label>
            <input
              id="auto-reply-trigger"
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g. price, cost, how much"
            />
          </div>
          <div className="segment-modal-field">
            <label htmlFor="auto-reply-match-type">Match type</label>
            <select
              id="auto-reply-match-type"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as 'contains' | 'exact')}
            >
              <option value="contains">Contains any keyword</option>
              <option value="exact">Exact phrase</option>
            </select>
          </div>
          <div className="segment-modal-field">
            <label htmlFor="auto-reply-message">
              Reply message <span className="segment-field-required">*</span>
            </label>
            <textarea
              id="auto-reply-message"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Your automatic reply..."
              rows={3}
            />
          </div>
        </form>
        <footer className="segment-modal-footer">
          <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-autoreply-form"
            className="segment-modal-btn segment-modal-btn-primary"
            disabled={!canSave}
          >
            Add rule
          </button>
        </footer>
      </div>
    </>
  )
}

type AutoReplyCardProps = {
  rule: AutoReplyRule
  isNew?: boolean
  isEditing?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (trigger: string, reply: string, matchType: 'contains' | 'exact') => void
  onCancel?: () => void
}

const AutoReplyCard: React.FC<AutoReplyCardProps> = ({
  rule,
  isNew,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
  const [trigger, setTrigger] = useState(rule.trigger)
  const [reply, setReply] = useState(rule.reply)
  const [matchType, setMatchType] = useState<'contains' | 'exact'>(rule.matchType)
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    if (trigger.trim() && reply.trim() && onSave) {
      onSave(trigger.trim(), reply.trim(), matchType)
    }
  }

  return (
    <div className={`auto-reply-card ${!rule.enabled ? 'disabled' : ''}`}>
      <div className="auto-reply-card-header">
        {!isNew && (
          <>
            <label className="auto-reply-toggle">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={onToggle ?? (() => {})}
              />
              <span className="toggle-slider" />
            </label>
            <span className="auto-reply-status">{rule.enabled ? 'Active' : 'Paused'}</span>
          </>
        )}
        {isNew && <span className="auto-reply-status">New rule</span>}
        {!canEdit && (
          <div className="auto-reply-actions">
            <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
              <HiOutlinePencil size={16} />
            </button>
            <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
              <HiOutlineTrash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="auto-reply-card-body">
        {canEdit ? (
          <>
            <div className="auto-reply-field">
              <label>Trigger keywords (comma-separated)</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="e.g. price, cost, how much"
              />
            </div>
            <div className="auto-reply-field">
              <label>Match type</label>
              <select value={matchType} onChange={(e) => setMatchType(e.target.value as 'contains' | 'exact')}>
                <option value="contains">Contains any keyword</option>
                <option value="exact">Exact phrase</option>
              </select>
            </div>
            <div className="auto-reply-field">
              <label>Reply message</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Your automatic reply..."
                rows={3}
              />
            </div>
            <div className="auto-reply-card-footer">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!trigger.trim() || !reply.trim()}
              >
                {isNew ? 'Add rule' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auto-reply-preview">
              <span className="preview-label">When customer says:</span>
              <span className="preview-value">{rule.trigger}</span>
              <span className="preview-meta">{rule.matchType === 'exact' ? 'Exact phrase' : 'Contains'}</span>
            </div>
            <div className="auto-reply-preview">
              <span className="preview-label">Bot replies:</span>
              <span className="preview-value">{rule.reply}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
