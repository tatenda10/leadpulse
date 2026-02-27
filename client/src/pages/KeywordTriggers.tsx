import React, { useEffect, useState } from 'react'
import { HiOutlineKey, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './KeywordTriggers.css'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update trigger')
    }
  }

  const deleteTrigger = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/keyword-triggers/${id}`, { method: 'DELETE', token })
      setTriggers((prev) => prev.filter((t) => t.id !== id))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete trigger')
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
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save trigger')
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add trigger')
    }
  }

  return (
    <div className="keyword-triggers-page">
      <header className="keyword-triggers-header">
        <div>
          <h1 className="keyword-triggers-title">
            <HiOutlineKey size={24} />
            Keyword Triggers
          </h1>
          <p className="keyword-triggers-desc">
            Define keywords that trigger specific bot actions like replies, menus, or human handover.
          </p>
        </div>
        <button
          type="button"
          className="keyword-triggers-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add trigger
        </button>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="keyword-triggers-empty"><p>Loading keyword triggers...</p></div>
      ) : (
      <div className="keyword-triggers-list">
        {isAdding && (
          <KeywordTriggerCard
            isNew
            trigger={{
              id: 'new',
              keywords: '',
              action: 'reply',
              value: '',
              enabled: true,
            }}
            onSave={(keywords, action, value) => void addTrigger(keywords, action, value)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {triggers.map((trigger) => (
          <KeywordTriggerCard
            key={trigger.id}
            trigger={trigger}
            isEditing={editingId === trigger.id}
            onToggle={() => void toggleTrigger(trigger.id)}
            onEdit={() => setEditingId(trigger.id)}
            onDelete={() => void deleteTrigger(trigger.id)}
            onSave={(keywords, action, value) => void saveTrigger(trigger.id, keywords, action, value)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>
      )}

      {triggers.length === 0 && !isAdding && !loading && (
        <div className="keyword-triggers-empty">
          <HiOutlineKey size={48} className="empty-icon" />
          <p>No keyword triggers yet</p>
          <span className="empty-hint">Add triggers to automate bot behavior based on customer messages</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first trigger
          </button>
        </div>
      )}
    </div>
  )
}

type KeywordTriggerCardProps = {
  trigger: KeywordTrigger
  isNew?: boolean
  isEditing?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (keywords: string, action: ActionType, value: string) => void
  onCancel?: () => void
}

const KeywordTriggerCard: React.FC<KeywordTriggerCardProps> = ({
  trigger,
  isNew,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
  const [keywords, setKeywords] = useState(trigger.keywords)
  const [action, setAction] = useState<ActionType>(trigger.action)
  const [value, setValue] = useState(trigger.value)
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    if (keywords.trim() && onSave) {
      onSave(keywords.trim(), action, value)
    }
  }

  const needsValue = action === 'reply'
  const needsMenuId = action === 'menu'
  const canSave =
    keywords.trim() &&
    (!needsValue || value.trim()) &&
    (!needsMenuId || value.trim())

  return (
    <div className={`keyword-trigger-card ${!trigger.enabled ? 'disabled' : ''}`}>
      <div className="keyword-trigger-card-header">
        {!isNew && (
          <>
            <label className="keyword-trigger-toggle">
              <input
                type="checkbox"
                checked={trigger.enabled}
                onChange={onToggle ?? (() => {})}
              />
              <span className="toggle-slider" />
            </label>
            <span className="keyword-trigger-status">{trigger.enabled ? 'Active' : 'Paused'}</span>
          </>
        )}
        {isNew && <span className="keyword-trigger-status">New trigger</span>}
        {!canEdit && (
          <div className="keyword-trigger-actions">
            <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
              <HiOutlinePencil size={16} />
            </button>
            <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
              <HiOutlineTrash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="keyword-trigger-card-body">
        {canEdit ? (
          <>
            <div className="keyword-trigger-field">
              <label>Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. price, cost, pricing"
              />
            </div>
            <div className="keyword-trigger-field">
              <label>Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value as ActionType)}>
                <option value="reply">Send reply</option>
                <option value="escalate">Escalate to human</option>
                <option value="menu">Show menu</option>
              </select>
            </div>
            {needsValue && (
              <div className="keyword-trigger-field">
                <label>Reply message</label>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Message to send..."
                  rows={3}
                />
              </div>
            )}
            {action === 'menu' && (
              <div className="keyword-trigger-field">
                <label>Menu ID</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. main_menu"
                />
              </div>
            )}
            <div className="keyword-trigger-card-footer">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!canSave}
              >
                {isNew ? 'Add trigger' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
