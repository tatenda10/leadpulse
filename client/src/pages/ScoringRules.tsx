import React, { useEffect, useState } from 'react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update rule')
    }
  }

  const deleteRule = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/scoring-rules/${id}`, { method: 'DELETE', token })
      setRules((prev) => prev.filter((r) => r.id !== id))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete rule')
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
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rule')
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add rule')
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

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {isAdding && (
        <AddRuleModal
          onClose={() => setIsAdding(false)}
          onSave={(conditionType, value, points) => void addRule(conditionType, value, points)}
        />
      )}

      {loading ? (
        <div className="scoring-rules-empty"><p>Loading rules...</p></div>
      ) : (
        <div className="scoring-rules-list">
          {rules.map((rule) => (
            <ScoringRuleCard
              key={rule.id}
              rule={rule}
              isEditing={editingId === rule.id}
              onToggle={() => void toggleRule(rule.id)}
              onEdit={() => setEditingId(rule.id)}
              onDelete={() => void deleteRule(rule.id)}
              onSave={(conditionType, value, points) => void saveRule(rule.id, conditionType, value, points)}
              onCancel={() => setEditingId(null)}
            />
          ))}
        </div>
      )}

      {rules.length === 0 && !isAdding && !loading && (
        <div className="scoring-rules-empty">
          <HiOutlineCalculator size={48} className="empty-icon" />
          <p>No scoring rules yet</p>
          <span className="empty-hint">Add rules to automatically score leads based on behavior</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first rule
          </button>
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

  return (
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
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
    </>
  )
}

type ScoringRuleCardProps = {
  rule: ScoringRule
  isNew?: boolean
  isEditing?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (conditionType: ConditionType, value: string, points: number) => void
  onCancel?: () => void
}

const ScoringRuleCard: React.FC<ScoringRuleCardProps> = ({ rule, isNew, isEditing, onToggle, onEdit, onDelete, onSave, onCancel }) => {
  const [conditionType, setConditionType] = useState<ConditionType>(rule.conditionType)
  const [value, setValue] = useState(rule.value)
  const [points, setPoints] = useState(String(rule.points))
  const canEdit = isNew ?? isEditing

  const needsValue = conditionType !== 'asked_callback'
  const isMessageCount = conditionType === 'message_count'

  const handleSave = () => {
    const pts = parseInt(points, 10)
    if (onSave && !isNaN(pts) && pts >= 0 && (!needsValue || value.trim())) {
      onSave(conditionType, value.trim(), pts)
    }
  }

  const canSave = !isNaN(parseInt(points, 10)) && parseInt(points, 10) >= 0 && (!needsValue || value.trim())

  const formatPreview = () => {
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

  return (
    <div className={`scoring-rule-card ${!rule.enabled ? 'disabled' : ''}`}>
      <div className="scoring-rule-card-header">
        {!isNew && (
          <>
            <label className="scoring-rule-toggle">
              <input type="checkbox" checked={rule.enabled} onChange={onToggle ?? (() => {})} />
              <span className="toggle-slider" />
            </label>
            <span className="scoring-rule-status">{rule.enabled ? 'Active' : 'Paused'}</span>
          </>
        )}
        {isNew && <span className="scoring-rule-status">New rule</span>}
        {!canEdit && (
          <div className="scoring-rule-actions">
            <span className="scoring-rule-points">+{rule.points} pts</span>
            <button type="button" className="icon-btn" onClick={onEdit} title="Edit"><HiOutlinePencil size={16} /></button>
            <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete"><HiOutlineTrash size={16} /></button>
          </div>
        )}
      </div>

      <div className="scoring-rule-card-body">
        {canEdit ? (
          <>
            <div className="scoring-rule-field">
              <label>Condition type</label>
              <select value={conditionType} onChange={(e) => setConditionType(e.target.value as ConditionType)}>
                <option value="keyword">Keyword in message</option>
                <option value="response_speed">Replied within (minutes)</option>
                <option value="message_count">Sent 5+ messages</option>
                <option value="asked_callback">Asked for callback</option>
              </select>
            </div>
            {needsValue && (
              <div className="scoring-rule-field">
                <label>{conditionType === 'keyword' ? 'Keywords (comma-separated)' : 'Value'}</label>
                <input type={isMessageCount ? 'number' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={CONDITION_HINTS[conditionType]} />
              </div>
            )}
            <div className="scoring-rule-field">
              <label>Points</label>
              <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="10" />
            </div>
            <div className="scoring-rule-card-footer">
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={!canSave}>{isNew ? 'Add rule' : 'Save'}</button>
            </div>
          </>
        ) : (
          <div className="scoring-rule-preview">
            <span className="preview-value">{formatPreview()}</span>
            <span className="preview-points">+{rule.points} pts</span>
          </div>
        )}
      </div>
    </div>
  )
}
