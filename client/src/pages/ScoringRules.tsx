import React, { useState } from 'react'
import { HiOutlineCalculator, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './ScoringRules.css'
import './ContactSegments.css'

type ConditionType = 'keyword' | 'response_speed' | 'message_count' | 'asked_callback'

type ScoringRule = {
  id: string
  conditionType: ConditionType
  value: string
  points: number
  enabled: boolean
}

const MOCK_RULES: ScoringRule[] = [
  { id: '1', conditionType: 'keyword', value: 'price, cost, how much, buy, order', points: 15, enabled: true },
  { id: '2', conditionType: 'keyword', value: 'catalogue, brochure', points: 8, enabled: true },
  { id: '3', conditionType: 'response_speed', value: '5', points: 10, enabled: true },
  { id: '4', conditionType: 'message_count', value: '5', points: 5, enabled: true },
  { id: '5', conditionType: 'asked_callback', value: '', points: 20, enabled: true },
]

const CONDITION_HINTS: Record<ConditionType, string> = {
  keyword: 'Comma-separated keywords',
  response_speed: 'Minutes (e.g. 5)',
  message_count: 'Number of messages',
  asked_callback: 'No value needed',
}

export const ScoringRules: React.FC = () => {
  const [rules, setRules] = useState<ScoringRule[]>(MOCK_RULES)
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

  const saveRule = (id: string, conditionType: ConditionType, value: string, points: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, conditionType, value, points } : r
      )
    )
    setEditingId(null)
  }

  const addRule = (conditionType: ConditionType, value: string, points: number) => {
    const newRule: ScoringRule = {
      id: String(Date.now()),
      conditionType,
      value,
      points,
      enabled: true,
    }
    setRules((prev) => [newRule, ...prev])
    setIsAdding(false)
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
        <button
          type="button"
          className="scoring-rules-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add rule
        </button>
      </header>

      {isAdding && (
        <AddRuleModal
          onClose={() => setIsAdding(false)}
          onSave={(conditionType, value, points) => addRule(conditionType, value, points)}
        />
      )}

      <div className="scoring-rules-list">
        {rules.map((rule) => (
          <ScoringRuleCard
            key={rule.id}
            rule={rule}
            isEditing={editingId === rule.id}
            onToggle={() => toggleRule(rule.id)}
            onEdit={() => setEditingId(rule.id)}
            onDelete={() => deleteRule(rule.id)}
            onSave={(conditionType, value, points) => saveRule(rule.id, conditionType, value, points)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>

      {rules.length === 0 && !isAdding && (
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
  const canSave =
    !isNaN(pts) && pts >= 0 && (!needsValue || value.trim())

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
            <select
              id="rule-condition-type"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value as ConditionType)}
            >
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
            <input
              id="rule-points"
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="10"
            />
          </div>
        </form>
        <footer className="segment-modal-footer">
          <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-rule-form"
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

const ScoringRuleCard: React.FC<ScoringRuleCardProps> = ({
  rule,
  isNew,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
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

  const canSave =
    !isNaN(parseInt(points, 10)) &&
    parseInt(points, 10) >= 0 &&
    (!needsValue || value.trim())

  const formatPreview = () => {
    switch (rule.conditionType) {
      case 'keyword':
        return rule.value
      case 'response_speed':
        return `Replied within ${rule.value} min → +${rule.points}`
      case 'message_count':
        return `Sent ${rule.value || '5'}+ messages → +${rule.points}`
      case 'asked_callback':
        return `Asked for callback → +${rule.points}`
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
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={onToggle ?? (() => {})}
              />
              <span className="toggle-slider" />
            </label>
            <span className="scoring-rule-status">{rule.enabled ? 'Active' : 'Paused'}</span>
          </>
        )}
        {isNew && <span className="scoring-rule-status">New rule</span>}
        {!canEdit && (
          <div className="scoring-rule-actions">
            <span className="scoring-rule-points">+{rule.points} pts</span>
            <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
              <HiOutlinePencil size={16} />
            </button>
            <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
              <HiOutlineTrash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="scoring-rule-card-body">
        {canEdit ? (
          <>
            <div className="scoring-rule-field">
              <label>Condition type</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as ConditionType)}
              >
                <option value="keyword">Keyword in message</option>
                <option value="response_speed">Replied within (minutes)</option>
                <option value="message_count">Sent 5+ messages</option>
                <option value="asked_callback">Asked for callback</option>
              </select>
            </div>
            {needsValue && (
              <div className="scoring-rule-field">
                <label>
                  {conditionType === 'keyword' ? 'Keywords (comma-separated)' : 'Value'}
                </label>
                <input
                  type={isMessageCount ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={CONDITION_HINTS[conditionType]}
                />
              </div>
            )}
            <div className="scoring-rule-field">
              <label>Points</label>
              <input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="scoring-rule-card-footer">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!canSave}
              >
                {isNew ? 'Add rule' : 'Save'}
              </button>
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
