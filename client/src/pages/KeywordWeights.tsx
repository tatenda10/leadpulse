import React, { useState } from 'react'
import { HiOutlineKey, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './KeywordWeights.css'

type KeywordWeight = {
  id: string
  keyword: string
  weight: number
}

const MOCK_WEIGHTS: KeywordWeight[] = [
  { id: '1', keyword: 'price', weight: 15 },
  { id: '2', keyword: 'buy', weight: 20 },
  { id: '3', keyword: 'order', weight: 18 },
  { id: '4', keyword: 'catalogue', weight: 10 },
  { id: '5', keyword: 'callback', weight: 25 },
]

export const KeywordWeights: React.FC = () => {
  const [weights, setWeights] = useState<KeywordWeight[]>(MOCK_WEIGHTS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const deleteWeight = (id: string) => {
    setWeights((prev) => prev.filter((w) => w.id !== id))
    setEditingId(null)
  }

  const saveWeight = (id: string, keyword: string, weight: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, keyword, weight } : w))
    )
    setEditingId(null)
  }

  const addWeight = (keyword: string, weight: number) => {
    const newWeight: KeywordWeight = {
      id: String(Date.now()),
      keyword,
      weight,
    }
    setWeights((prev) => [newWeight, ...prev])
    setIsAdding(false)
  }

  return (
    <div className="keyword-weights-page">
      <header className="keyword-weights-header">
        <div>
          <h1 className="keyword-weights-title">
            <HiOutlineKey size={24} />
            Keyword Weights
          </h1>
          <p className="keyword-weights-desc">
            Assign point values to keywords. When a lead uses these words, their score increases by the weight.
          </p>
        </div>
        <button
          type="button"
          className="keyword-weights-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add keyword
        </button>
      </header>

      <div className="keyword-weights-list">
        {isAdding && (
          <KeywordWeightCard
            isNew
            weight={{ id: 'new', keyword: '', weight: 10 }}
            onSave={(keyword, w) => addWeight(keyword, w)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {weights.map((w) => (
          <KeywordWeightCard
            key={w.id}
            weight={w}
            isEditing={editingId === w.id}
            onEdit={() => setEditingId(w.id)}
            onDelete={() => deleteWeight(w.id)}
            onSave={(keyword, weight) => saveWeight(w.id, keyword, weight)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>

      {weights.length === 0 && !isAdding && (
        <div className="keyword-weights-empty">
          <HiOutlineKey size={48} className="empty-icon" />
          <p>No keyword weights yet</p>
          <span className="empty-hint">Add keywords and assign weights for lead scoring</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first keyword
          </button>
        </div>
      )}
    </div>
  )
}

type KeywordWeightCardProps = {
  weight: KeywordWeight
  isNew?: boolean
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (keyword: string, weight: number) => void
  onCancel?: () => void
}

const KeywordWeightCard: React.FC<KeywordWeightCardProps> = ({
  weight,
  isNew,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
  const [keyword, setKeyword] = useState(weight.keyword)
  const [weightVal, setWeightVal] = useState(String(weight.weight))
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    const w = parseInt(weightVal, 10)
    if (keyword.trim() && !isNaN(w) && w >= 0 && onSave) {
      onSave(keyword.trim(), w)
    }
  }

  const canSave = keyword.trim() && !isNaN(parseInt(weightVal, 10)) && parseInt(weightVal, 10) >= 0

  return (
    <div className="keyword-weight-card">
      <div className="keyword-weight-card-header">
        {!canEdit ? (
          <>
            <span className="keyword-weight-preview">{weight.keyword}</span>
            <span className="keyword-weight-value">+{weight.weight}</span>
            <div className="keyword-weight-actions">
              <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
                <HiOutlinePencil size={16} />
              </button>
              <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
                <HiOutlineTrash size={16} />
              </button>
            </div>
          </>
        ) : (
          <span className="keyword-weight-new-label">{isNew ? 'New keyword' : 'Editing'}</span>
        )}
      </div>
      {canEdit && (
        <div className="keyword-weight-card-body">
          <div className="keyword-weight-field">
            <label>Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. price"
            />
          </div>
          <div className="keyword-weight-field">
            <label>Weight (points)</label>
            <input
              type="number"
              min={0}
              value={weightVal}
              onChange={(e) => setWeightVal(e.target.value)}
            />
          </div>
          <div className="keyword-weight-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!canSave}>
              {isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
