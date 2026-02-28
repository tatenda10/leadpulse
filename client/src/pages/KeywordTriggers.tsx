import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineKey, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './KeywordTriggers.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type ActionType = 'reply' | 'escalate' | 'menu'

type KeywordTrigger = {
  id: string
  keywords: string
  action: ActionType
  value: string
  enabled: boolean
}

type TriggersResponse = { triggers: KeywordTrigger[] }
type TriggerResponse = { trigger: KeywordTrigger }

const ACTION_LABELS: Record<ActionType, string> = {
  reply: 'Send reply',
  escalate: 'Escalate to human',
  menu: 'Show menu',
}

export const KeywordTriggers: React.FC = () => {
  const { token } = useAuth()
  const [triggers, setTriggers] = useState<KeywordTrigger[]>([])
  const [editingTrigger, setEditingTrigger] = useState<KeywordTrigger | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTriggers() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<TriggersResponse>('/settings/keyword-triggers', { token })
        if (!cancelled) setTriggers(response.triggers)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load keyword triggers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadTriggers()
    return () => {
      cancelled = true
    }
  }, [token])

  const toggleTrigger = async (id: string) => {
    if (!token) return
    const current = triggers.find((t) => t.id === id)
    if (!current) return
    try {
      const response = await apiRequest<TriggerResponse>(`/settings/keyword-triggers/${id}`, {
        method: 'PATCH',
        body: { enabled: !current.enabled },
        token,
      })
      setTriggers((prev) => prev.map((t) => (t.id === id ? response.trigger : t)))
      setToast({ message: response.trigger.enabled ? 'Trigger enabled' : 'Trigger paused', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to update trigger', type: 'error' })
    }
  }

  const deleteTrigger = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/keyword-triggers/${id}`, { method: 'DELETE', token })
      setTriggers((prev) => prev.filter((t) => t.id !== id))
      setDeleteConfirmId(null)
      setToast({ message: 'Trigger deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete trigger', type: 'error' })
    }
  }

  const saveTrigger = async (id: string, keywords: string, action: ActionType, value: string) => {
    if (!token) return
    try {
      const response = await apiRequest<TriggerResponse>(`/settings/keyword-triggers/${id}`, {
        method: 'PATCH',
        body: { keywords, action, value },
        token,
      })
      setTriggers((prev) => prev.map((t) => (t.id === id ? response.trigger : t)))
      setEditingTrigger(null)
      setToast({ message: 'Trigger updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save trigger', type: 'error' })
    }
  }

  const addTrigger = async (keywords: string, action: ActionType, value: string) => {
    if (!token) return
    try {
      const response = await apiRequest<TriggerResponse>('/settings/keyword-triggers', {
        method: 'POST',
        body: { keywords, action, value, enabled: true },
        token,
      })
      setTriggers((prev) => [response.trigger, ...prev])
      setIsAdding(false)
      setToast({ message: 'Trigger added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add trigger', type: 'error' })
    }
  }

  return (
    <div className="keyword-triggers-page">
      <div className="keyword-triggers-header">
        <div className="keyword-triggers-header-text">
          <h1 className="keyword-triggers-title">Keyword Triggers</h1>
          <p className="keyword-triggers-desc">
            Define keywords that trigger specific bot actions like replies, menus, or human handover.
          </p>
        </div>
        <button type="button" className="keyword-triggers-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add trigger
        </button>
      </div>

      <div className="keyword-triggers-container">
        {error && <div className="keyword-triggers-error">{error}</div>}

        {isAdding && (
          <AddKeywordTriggerModal
            onClose={() => setIsAdding(false)}
            onSave={(keywords, action, value) => void addTrigger(keywords, action, value)}
          />
        )}

        {editingTrigger && (
          <EditKeywordTriggerModal
            trigger={editingTrigger}
            onClose={() => setEditingTrigger(null)}
            onSave={(keywords, action, value) => void saveTrigger(editingTrigger.id, keywords, action, value)}
          />
        )}

        {deleteConfirmId && (
          <DeleteConfirmModal
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={() => void deleteTrigger(deleteConfirmId)}
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
          <div className="keyword-triggers-empty"><p>Loading keyword triggers...</p></div>
        ) : triggers.length === 0 && !isAdding ? (
          <div className="keyword-triggers-empty">
            <HiOutlineKey size={48} className="empty-icon" />
            <p>No keyword triggers yet</p>
            <span className="empty-hint">Add triggers to automate bot behavior based on customer messages</span>
            <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
              <HiOutlinePlus size={18} />
              Add your first trigger
            </button>
          </div>
        ) : (
          <div className="keyword-triggers-list">
            {triggers.map((trigger) => (
              <KeywordTriggerCard
                key={trigger.id}
                trigger={trigger}
                onToggle={() => void toggleTrigger(trigger.id)}
                onEdit={() => setEditingTrigger(trigger)}
                onDelete={() => setDeleteConfirmId(trigger.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type AddKeywordTriggerModalProps = {
  onClose: () => void
  onSave: (keywords: string, action: ActionType, value: string) => void
}

const AddKeywordTriggerModal: React.FC<AddKeywordTriggerModalProps> = ({ onClose, onSave }) => {
  const [keywords, setKeywords] = useState('')
  const [action, setAction] = useState<ActionType>('reply')
  const [value, setValue] = useState('')

  const needsValue = action === 'reply' || action === 'menu'
  const canSave = keywords.trim() && (!needsValue || value.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(keywords.trim(), action, value.trim())
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="keyword-trigger-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-keyword-trigger-modal-title">
          <div className="segment-modal-header">
            <h2 id="add-keyword-trigger-modal-title" className="segment-modal-title">Add trigger</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-keyword-trigger-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="keyword-trigger-keywords">
                Keywords (comma-separated) <span className="segment-field-required">*</span>
              </label>
              <input
                id="keyword-trigger-keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. price, cost, pricing"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="keyword-trigger-action">Action</label>
              <select
                id="keyword-trigger-action"
                value={action}
                onChange={(e) => setAction(e.target.value as ActionType)}
              >
                <option value="reply">Send reply</option>
                <option value="escalate">Escalate to human</option>
                <option value="menu">Show menu</option>
              </select>
            </div>
            {action === 'reply' && (
              <div className="segment-modal-field">
                <label htmlFor="keyword-trigger-reply">
                  Reply message <span className="segment-field-required">*</span>
                </label>
                <textarea
                  id="keyword-trigger-reply"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Message to send..."
                  rows={3}
                />
              </div>
            )}
            {action === 'menu' && (
              <div className="segment-modal-field">
                <label htmlFor="keyword-trigger-menu-id">
                  Menu ID <span className="segment-field-required">*</span>
                </label>
                <input
                  id="keyword-trigger-menu-id"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. main_menu"
                />
              </div>
            )}
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-keyword-trigger-form"
              className="segment-modal-btn segment-modal-btn-primary"
              disabled={!canSave}
            >
              Add trigger
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type EditKeywordTriggerModalProps = {
  trigger: KeywordTrigger
  onClose: () => void
  onSave: (keywords: string, action: ActionType, value: string) => void
}

const EditKeywordTriggerModal: React.FC<EditKeywordTriggerModalProps> = ({ trigger, onClose, onSave }) => {
  const [keywords, setKeywords] = useState(trigger.keywords)
  const [action, setAction] = useState<ActionType>(trigger.action)
  const [value, setValue] = useState(trigger.value)

  const needsValue = action === 'reply' || action === 'menu'
  const canSave = keywords.trim() && (!needsValue || value.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(keywords.trim(), action, value.trim())
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="keyword-trigger-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-keyword-trigger-modal-title">
          <div className="segment-modal-header">
            <h2 id="edit-keyword-trigger-modal-title" className="segment-modal-title">Edit trigger</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-keyword-trigger-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-keyword-trigger-keywords">
                Keywords (comma-separated) <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-keyword-trigger-keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. price, cost, pricing"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="edit-keyword-trigger-action">Action</label>
              <select
                id="edit-keyword-trigger-action"
                value={action}
                onChange={(e) => setAction(e.target.value as ActionType)}
              >
                <option value="reply">Send reply</option>
                <option value="escalate">Escalate to human</option>
                <option value="menu">Show menu</option>
              </select>
            </div>
            {action === 'reply' && (
              <div className="segment-modal-field">
                <label htmlFor="edit-keyword-trigger-reply">
                  Reply message <span className="segment-field-required">*</span>
                </label>
                <textarea
                  id="edit-keyword-trigger-reply"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Message to send..."
                  rows={3}
                />
              </div>
            )}
            {action === 'menu' && (
              <div className="segment-modal-field">
                <label htmlFor="edit-keyword-trigger-menu-id">
                  Menu ID <span className="segment-field-required">*</span>
                </label>
                <input
                  id="edit-keyword-trigger-menu-id"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. main_menu"
                />
              </div>
            )}
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-keyword-trigger-form"
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
      <div className="keyword-trigger-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-keyword-trigger-confirm-title">
          <div className="segment-modal-header">
            <h2 id="delete-keyword-trigger-confirm-title" className="segment-modal-title">Delete trigger</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">Are you sure you want to delete this keyword trigger? This cannot be undone.</p>
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

type KeywordTriggerCardProps = {
  trigger: KeywordTrigger
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const KeywordTriggerCard: React.FC<KeywordTriggerCardProps> = ({
  trigger,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={`keyword-trigger-card ${!trigger.enabled ? 'disabled' : ''}`}>
      <div className="keyword-trigger-card-header">
        <label className="keyword-trigger-toggle">
          <input type="checkbox" checked={trigger.enabled} onChange={onToggle ?? (() => {})} />
          <span className="toggle-slider" />
        </label>
        <span className="keyword-trigger-status">{trigger.enabled ? 'Active' : 'Paused'}</span>
        <div className="keyword-trigger-actions">
          <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
            <HiOutlinePencil size={16} />
          </button>
          <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
            <HiOutlineTrash size={16} />
          </button>
        </div>
      </div>

      <div className="keyword-trigger-card-body">
        <div className="keyword-trigger-preview">
          <span className="preview-label">Keywords:</span>
          <span className="preview-value">{trigger.keywords}</span>
        </div>
        <div className="keyword-trigger-preview">
          <span className="preview-label">Action:</span>
          <span className="preview-value">{ACTION_LABELS[trigger.action]}</span>
        </div>
        {trigger.action === 'reply' && trigger.value && (
          <div className="keyword-trigger-preview">
            <span className="preview-label">Reply:</span>
            <span className="preview-value">{trigger.value}</span>
          </div>
        )}
        {trigger.action === 'menu' && trigger.value && (
          <div className="keyword-trigger-preview">
            <span className="preview-label">Menu:</span>
            <span className="preview-value">{trigger.value}</span>
          </div>
        )}
      </div>
    </div>
  )
}
