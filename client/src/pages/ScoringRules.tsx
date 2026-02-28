import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineCalculator, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './ScoringRules.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type ConditionType = 'keyword' | 'response_speed' | 'message_count' | 'asked_callback'

type ScoringRule = {
  id: string
  conditionType: ConditionType
  value: string
  points: number
  enabled: boolean
}

type ScoringRulesResponse = { rules: ScoringRule[] }
type ScoringRuleResponse = { rule: ScoringRule }

const CONDITION_HINTS: Record<ConditionType, string> = {
  keyword: 'Comma-separated keywords',
  response_speed: 'Minutes (e.g. 5)',
  message_count: 'Number of messages',
  asked_callback: 'No value needed',
}

export const ScoringRules: React.FC = () => {
  const { token } = useAuth()
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null)
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
        const response = await apiRequest<ScoringRulesResponse>('/settings/scoring-rules', { token })
        if (!cancelled) setRules(response.rules)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load scoring rules')
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
    const current = rules.find((r) => r.id === id)
    if (!current || !token) return
    try {
      const response = await apiRequest<ScoringRuleResponse>(`/settings/scoring-rules/${id}`, {
        method: 'PATCH',
        body: { enabled: !current.enabled },
        token,
      })
      setRules((prev) => prev.map((r) => (r.id === id ? response.rule : r)))
      setToast({ message: response.rule.enabled ? 'Rule enabled' : 'Rule paused', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to update rule', type: 'error' })
    }
  }

  const deleteRule = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/scoring-rules/${id}`, { method: 'DELETE', token })
      setRules((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
      setToast({ message: 'Rule deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete rule', type: 'error' })
    }
  }

  const saveRule = async (id: string, conditionType: ConditionType, value: string, points: number) => {
    if (!token) return
    try {
      const response = await apiRequest<ScoringRuleResponse>(`/settings/scoring-rules/${id}`, {
        method: 'PATCH',
        body: { conditionType, value, points },
        token,
      })
      setRules((prev) => prev.map((r) => (r.id === id ? response.rule : r)))
      setEditingRule(null)
      setToast({ message: 'Rule updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save rule', type: 'error' })
    }
  }

  const addRule = async (conditionType: ConditionType, value: string, points: number) => {
    if (!token) return
    try {
      const response = await apiRequest<ScoringRuleResponse>('/settings/scoring-rules', {
        method: 'POST',
        body: { conditionType, value, points, enabled: true },
        token,
      })
      setRules((prev) => [response.rule, ...prev])
      setIsAdding(false)
      setToast({ message: 'Rule added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add rule', type: 'error' })
    }
  }

  return (
    <div className="scoring-rules-page">
      <header className="scoring-rules-header">
        <div>
          <h1 className="scoring-rules-title">
            <HiOutlineCalculator size={24} />
            Scoring Rules
          </h1>
          <p className="scoring-rules-desc">
            Define how lead scores are calculated. Points add up to identify hot leads.
          </p>
        </div>
        <button type="button" className="scoring-rules-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add rule
        </button>
      </header>

      {error && <div className="scoring-rules-error">{error}</div>}

      {isAdding && (
        <AddRuleModal
          onClose={() => setIsAdding(false)}
          onSave={(conditionType, value, points) => void addRule(conditionType, value, points)}
        />
      )}

      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={(conditionType, value, points) => void saveRule(editingRule.id, conditionType, value, points)}
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
        <div className="scoring-rules-empty"><p>Loading rules...</p></div>
      ) : rules.length === 0 && !isAdding ? (
        <div className="scoring-rules-empty">
          <HiOutlineCalculator size={48} className="empty-icon" />
          <p>No scoring rules yet</p>
          <span className="empty-hint">Add rules to automatically score leads based on behavior</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first rule
          </button>
        </div>
      ) : (
        <div className="scoring-rules-list">
          {rules.map((rule) => (
            <ScoringRuleCard
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
  )
}

type AddRuleModalProps = {
  onClose: () => void
  onSave: (conditionType: ConditionType, value: string, points: number) => void
}

const AddRuleModal: React.FC<AddRuleModalProps> = ({ onClose, onSave }) => {
  const [conditionType, setConditionType] = useState<ConditionType>('keyword')
  const [value, setValue] = useState('')
  const [points, setPoints] = useState('10')

  const needsValue = conditionType !== 'asked_callback'
  const isMessageCount = conditionType === 'message_count'
  const pts = parseInt(points, 10)
  const canSave = !isNaN(pts) && pts >= 0 && (!needsValue || value.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(conditionType, value.trim(), pts)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="scoring-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-rule-modal-title">
          <div className="segment-modal-header">
            <h2 id="add-rule-modal-title" className="segment-modal-title">Add rule</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-rule-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="rule-condition-type">Condition type</label>
              <select id="rule-condition-type" value={conditionType} onChange={(e) => setConditionType(e.target.value as ConditionType)}>
                <option value="keyword">Keyword in message</option>
                <option value="response_speed">Replied within (minutes)</option>
                <option value="message_count">Sent 5+ messages</option>
                <option value="asked_callback">Asked for callback</option>
              </select>
            </div>
            {needsValue && (
              <div className="segment-modal-field">
                <label htmlFor="rule-value">
                  {conditionType === 'keyword' ? 'Keywords (comma-separated)' : 'Value'}
                  <span className="segment-field-required">*</span>
                </label>
                <input
                  id="rule-value"
                  type={isMessageCount ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={CONDITION_HINTS[conditionType]}
                />
              </div>
            )}
            <div className="segment-modal-field">
              <label htmlFor="rule-points">Points <span className="segment-field-required">*</span></label>
              <input id="rule-points" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="10" />
            </div>
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="add-rule-form" className="segment-modal-btn segment-modal-btn-primary" disabled={!canSave}>Add rule</button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type EditRuleModalProps = {
  rule: ScoringRule
  onClose: () => void
  onSave: (conditionType: ConditionType, value: string, points: number) => void
}

const EditRuleModal: React.FC<EditRuleModalProps> = ({ rule, onClose, onSave }) => {
  const [conditionType, setConditionType] = useState<ConditionType>(rule.conditionType)
  const [value, setValue] = useState(rule.value)
  const [points, setPoints] = useState(String(rule.points))

  const needsValue = conditionType !== 'asked_callback'
  const isMessageCount = conditionType === 'message_count'
  const pts = parseInt(points, 10)
  const canSave = !isNaN(pts) && pts >= 0 && (!needsValue || value.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(conditionType, value.trim(), pts)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="scoring-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-rule-modal-title">
          <div className="segment-modal-header">
            <h2 id="edit-rule-modal-title" className="segment-modal-title">Edit rule</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-rule-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-rule-condition-type">Condition type</label>
              <select id="edit-rule-condition-type" value={conditionType} onChange={(e) => setConditionType(e.target.value as ConditionType)}>
                <option value="keyword">Keyword in message</option>
                <option value="response_speed">Replied within (minutes)</option>
                <option value="message_count">Sent 5+ messages</option>
                <option value="asked_callback">Asked for callback</option>
              </select>
            </div>
            {needsValue && (
              <div className="segment-modal-field">
                <label htmlFor="edit-rule-value">
                  {conditionType === 'keyword' ? 'Keywords (comma-separated)' : 'Value'}
                  <span className="segment-field-required">*</span>
                </label>
                <input
                  id="edit-rule-value"
                  type={isMessageCount ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={CONDITION_HINTS[conditionType]}
                />
              </div>
            )}
            <div className="segment-modal-field">
              <label htmlFor="edit-rule-points">Points <span className="segment-field-required">*</span></label>
              <input id="edit-rule-points" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="10" />
            </div>
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="edit-rule-form" className="segment-modal-btn segment-modal-btn-primary" disabled={!canSave}>Save</button>
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
      <div className="scoring-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="scoring-delete-confirm-title">
          <div className="segment-modal-header">
            <h2 id="scoring-delete-confirm-title" className="segment-modal-title">Delete rule</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">Are you sure you want to delete this scoring rule? This cannot be undone.</p>
          </div>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="segment-modal-btn segment-modal-btn-danger" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
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
    <div className={`scoring-toast scoring-toast-${type}`} role="status">
      <span className="scoring-toast-message">{message}</span>
      <button type="button" className="scoring-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}

type ScoringRuleCardProps = {
  rule: ScoringRule
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function formatPreview(rule: ScoringRule): string {
  switch (rule.conditionType) {
    case 'keyword':
      return rule.value
    case 'response_speed':
      return `Replied within ${rule.value} min -> +${rule.points}`
    case 'message_count':
      return `Sent ${rule.value || '5'}+ messages -> +${rule.points}`
    case 'asked_callback':
      return `Asked for callback -> +${rule.points}`
    default:
      return rule.value || `+${rule.points} pts`
  }
}

const ScoringRuleCard: React.FC<ScoringRuleCardProps> = ({ rule, onToggle, onEdit, onDelete }) => {
  return (
    <div className={`scoring-rule-card ${!rule.enabled ? 'disabled' : ''}`}>
      <div className="scoring-rule-card-header">
        <label className="scoring-rule-toggle">
          <input type="checkbox" checked={rule.enabled} onChange={onToggle ?? (() => {})} />
          <span className="toggle-slider" />
        </label>
        <span className="scoring-rule-status">{rule.enabled ? 'Active' : 'Paused'}</span>
        <div className="scoring-rule-actions">
          <span className="scoring-rule-points">+{rule.points} pts</span>
          <button type="button" className="icon-btn" onClick={onEdit} title="Edit"><HiOutlinePencil size={16} /></button>
          <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete"><HiOutlineTrash size={16} /></button>
        </div>
      </div>

      <div className="scoring-rule-card-body">
        <div className="scoring-rule-preview">
          <span className="preview-value">{formatPreview(rule)}</span>
          <span className="preview-points">+{rule.points} pts</span>
        </div>
      </div>
    </div>
  )
}
