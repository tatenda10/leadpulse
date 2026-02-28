import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineReply, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './AutoReplies.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type AutoReplyRule = {
  id: string
  trigger: string
  reply: string
  enabled: boolean
  matchType: 'contains' | 'exact'
}

type AutoRepliesResponse = {
  rules: AutoReplyRule[]
}

type AutoReplyResponse = {
  rule: AutoReplyRule
}

export const AutoReplies: React.FC = () => {
  const { token } = useAuth()
  const [rules, setRules] = useState<AutoReplyRule[]>([])
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadRules() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<AutoRepliesResponse>('/settings/auto-replies', { token })
        if (!cancelled) setRules(response.rules)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load auto replies')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadRules()
    return () => {
      cancelled = true
    }
  }, [token])

  const toggleRule = async (id: string) => {
    if (!token) return
    const current = rules.find((r) => r.id === id)
    if (!current) return
    try {
      const response = await apiRequest<AutoReplyResponse>(`/settings/auto-replies/${id}`, {
        method: 'PATCH',
        body: { enabled: !current.enabled },
        token,
      })
      setRules((prev) => prev.map((r) => (r.id === id ? response.rule : r)))
      setToast({ message: response.rule.enabled ? 'Rule enabled' : 'Rule paused', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to update auto reply', type: 'error' })
    }
  }

  const deleteRule = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/auto-replies/${id}`, { method: 'DELETE', token })
      setRules((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
      setToast({ message: 'Rule deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete auto reply', type: 'error' })
    }
  }

  const saveRule = async (id: string, trigger: string, reply: string, matchType: 'contains' | 'exact') => {
    if (!token) return
    try {
      const response = await apiRequest<AutoReplyResponse>(`/settings/auto-replies/${id}`, {
        method: 'PATCH',
        body: { trigger, reply, matchType },
        token,
      })
      setRules((prev) => prev.map((r) => (r.id === id ? response.rule : r)))
      setEditingRule(null)
      setToast({ message: 'Rule updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save auto reply', type: 'error' })
    }
  }

  const addRule = async (trigger: string, reply: string, matchType: 'contains' | 'exact') => {
    if (!token) return
    try {
      const response = await apiRequest<AutoReplyResponse>('/settings/auto-replies', {
        method: 'POST',
        body: { trigger, reply, matchType, enabled: true },
        token,
      })
      setRules((prev) => [response.rule, ...prev])
      setIsAdding(false)
      setToast({ message: 'Rule added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add auto reply', type: 'error' })
    }
  }

  return (
    <div className="auto-replies-page">
      <div className="auto-replies-header">
        <div className="auto-replies-header-text">
          <h1 className="auto-replies-title">Auto Replies</h1>
          <p className="auto-replies-desc">
            Configure automatic replies when customers send specific keywords or phrases.
          </p>
        </div>
        <button type="button" className="auto-replies-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add rule
        </button>
      </div>

      <div className="auto-replies-container">
        {error && <div className="auto-replies-error">{error}</div>}

        {isAdding && (
          <AddAutoReplyModal
            onClose={() => setIsAdding(false)}
            onSave={(trigger, reply, matchType) => void addRule(trigger, reply, matchType)}
          />
        )}

        {editingRule && (
          <EditAutoReplyModal
            rule={editingRule}
            onClose={() => setEditingRule(null)}
            onSave={(trigger, reply, matchType) => void saveRule(editingRule.id, trigger, reply, matchType)}
          />
        )}

        {deleteConfirmId && (
          <DeleteConfirmModal
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={() => void deleteRule(deleteConfirmId)}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {loading ? (
          <div className="auto-replies-empty"><p>Loading auto replies...</p></div>
        ) : rules.length === 0 && !isAdding ? (
          <div className="auto-replies-empty">
            <HiOutlineReply size={48} className="empty-icon" />
            <p>No auto reply rules yet</p>
            <span className="empty-hint">Add a rule to let your bot respond automatically to keywords</span>
            <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
              <HiOutlinePlus size={18} />
              Add your first rule
            </button>
          </div>
        ) : (
          <div className="auto-replies-list">
            {rules.map((rule) => (
              <AutoReplyCard
                key={rule.id}
                rule={rule}
                onToggle={() => void toggleRule(rule.id)}
                onEdit={() => setEditingRule(rule)}
                onDelete={() => setDeleteConfirmId(rule.id)}
              />
            ))}
          </div>
        )}
      </div>
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

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="autoreply-modal-center">
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
      </div>
    </>,
    document.body
  )
}

type EditAutoReplyModalProps = {
  rule: AutoReplyRule
  onClose: () => void
  onSave: (trigger: string, reply: string, matchType: 'contains' | 'exact') => void
}

const EditAutoReplyModal: React.FC<EditAutoReplyModalProps> = ({ rule, onClose, onSave }) => {
  const [trigger, setTrigger] = useState(rule.trigger)
  const [reply, setReply] = useState(rule.reply)
  const [matchType, setMatchType] = useState<'contains' | 'exact'>(rule.matchType)

  const canSave = trigger.trim() && reply.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(trigger.trim(), reply.trim(), matchType)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="autoreply-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-autoreply-modal-title">
          <div className="segment-modal-header">
            <h2 id="edit-autoreply-modal-title" className="segment-modal-title">Edit rule</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-autoreply-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-auto-reply-trigger">
                Trigger keywords (comma-separated) <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-auto-reply-trigger"
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="e.g. price, cost, how much"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="edit-auto-reply-match-type">Match type</label>
              <select
                id="edit-auto-reply-match-type"
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as 'contains' | 'exact')}
              >
                <option value="contains">Contains any keyword</option>
                <option value="exact">Exact phrase</option>
              </select>
            </div>
            <div className="segment-modal-field">
              <label htmlFor="edit-auto-reply-message">
                Reply message <span className="segment-field-required">*</span>
              </label>
              <textarea
                id="edit-auto-reply-message"
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
              form="edit-autoreply-form"
              className="segment-modal-btn segment-modal-btn-primary"
              disabled={!canSave}
            >
              Save
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type DeleteConfirmModalProps = {
  onClose: () => void
  onConfirm: () => void
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ onClose, onConfirm }) => {
  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="autoreply-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="segment-modal-header">
            <h2 id="delete-confirm-title" className="segment-modal-title">Delete rule</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">Are you sure you want to delete this auto reply rule? This cannot be undone.</p>
          </div>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="segment-modal-btn segment-modal-btn-danger" onClick={() => { onConfirm(); onClose(); }}>
              Delete
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}

type AutoReplyCardProps = {
  rule: AutoReplyRule
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const AutoReplyCard: React.FC<AutoReplyCardProps> = ({
  rule,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={`auto-reply-card ${!rule.enabled ? 'disabled' : ''}`}>
      <div className="auto-reply-card-header">
        <label className="auto-reply-toggle">
          <input type="checkbox" checked={rule.enabled} onChange={onToggle ?? (() => {})} />
          <span className="toggle-slider" />
        </label>
        <span className="auto-reply-status">{rule.enabled ? 'Active' : 'Paused'}</span>
        <div className="auto-reply-actions">
          <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
            <HiOutlinePencil size={16} />
          </button>
          <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
            <HiOutlineTrash size={16} />
          </button>
        </div>
      </div>

      <div className="auto-reply-card-body">
        <div className="auto-reply-preview">
          <span className="preview-label">When customer says:</span>
          <span className="preview-value">{rule.trigger}</span>
          <span className="preview-meta">{rule.matchType === 'exact' ? 'Exact phrase' : 'Contains'}</span>
        </div>
        <div className="auto-reply-preview">
          <span className="preview-label">Bot replies:</span>
          <span className="preview-value">{rule.reply}</span>
        </div>
      </div>
    </div>
  )
}
