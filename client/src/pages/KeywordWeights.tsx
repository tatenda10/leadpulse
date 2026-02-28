import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineKey, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './KeywordWeights.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type KeywordWeight = {
  id: string
  keyword: string
  weight: number
}

type KeywordWeightsResponse = { weights: KeywordWeight[] }
type KeywordWeightResponse = { keywordWeight: KeywordWeight }

export const KeywordWeights: React.FC = () => {
  const { token } = useAuth()
  const [weights, setWeights] = useState<KeywordWeight[]>([])
  const [editingWeight, setEditingWeight] = useState<KeywordWeight | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadWeights() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<KeywordWeightsResponse>('/settings/keyword-weights', { token })
        if (!cancelled) setWeights(response.weights)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load keyword weights')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadWeights()
    return () => {
      cancelled = true
    }
  }, [token])

  const deleteWeight = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/keyword-weights/${id}`, { method: 'DELETE', token })
      setWeights((prev) => prev.filter((w) => w.id !== id))
      setDeleteConfirmId(null)
      setToast({ message: 'Keyword deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete keyword', type: 'error' })
    }
  }

  const saveWeight = async (id: string, keyword: string, weight: number) => {
    if (!token) return
    try {
      const response = await apiRequest<KeywordWeightResponse>(`/settings/keyword-weights/${id}`, {
        method: 'PATCH',
        body: { keyword, weight },
        token,
      })
      setWeights((prev) => prev.map((w) => (w.id === id ? response.keywordWeight : w)))
      setEditingWeight(null)
      setToast({ message: 'Keyword updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save keyword', type: 'error' })
    }
  }

  const addWeight = async (keyword: string, weight: number) => {
    if (!token) return
    try {
      const response = await apiRequest<KeywordWeightResponse>('/settings/keyword-weights', {
        method: 'POST',
        body: { keyword, weight },
        token,
      })
      setWeights((prev) => [response.keywordWeight, ...prev])
      setIsAdding(false)
      setToast({ message: 'Keyword added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add keyword', type: 'error' })
    }
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
        <button type="button" className="keyword-weights-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add keyword
        </button>
      </header>

      {error && <div className="keyword-weights-error">{error}</div>}

      {isAdding && (
        <AddKeywordWeightModal
          onClose={() => setIsAdding(false)}
          onSave={(keyword, w) => void addWeight(keyword, w)}
        />
      )}

      {editingWeight && (
        <EditKeywordWeightModal
          weight={editingWeight}
          onClose={() => setEditingWeight(null)}
          onSave={(keyword, w) => void saveWeight(editingWeight.id, keyword, w)}
        />
      )}

      {deleteConfirmId && (
        <DeleteConfirmModal
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => void deleteWeight(deleteConfirmId)}
        />
      )}

      {toast && (
        <KeywordWeightsToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <div className="keyword-weights-empty"><p>Loading keyword weights...</p></div>
      ) : weights.length === 0 && !isAdding ? (
        <div className="keyword-weights-empty">
          <HiOutlineKey size={48} className="empty-icon" />
          <p>No keyword weights yet</p>
          <span className="empty-hint">Add keywords and assign weights for lead scoring</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first keyword
          </button>
        </div>
      ) : (
        <div className="keyword-weights-list">
          {weights.map((w) => (
            <KeywordWeightCard
              key={w.id}
              weight={w}
              onEdit={() => setEditingWeight(w)}
              onDelete={() => setDeleteConfirmId(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type AddKeywordWeightModalProps = {
  onClose: () => void
  onSave: (keyword: string, weight: number) => void
}

const AddKeywordWeightModal: React.FC<AddKeywordWeightModalProps> = ({ onClose, onSave }) => {
  const [keyword, setKeyword] = useState('')
  const [weight, setWeight] = useState('10')

  const w = parseInt(weight, 10)
  const canSave = keyword.trim() && !isNaN(w) && w >= 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(keyword.trim(), w)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="keyword-weights-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-keyword-weight-modal-title">
          <div className="segment-modal-header">
            <h2 id="add-keyword-weight-modal-title" className="segment-modal-title">Add keyword weight</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-keyword-weight-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="keyword-weight-keyword">
                Keyword <span className="segment-field-required">*</span>
              </label>
              <input
                id="keyword-weight-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. price"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="keyword-weight-value">
                Weight (points) <span className="segment-field-required">*</span>
              </label>
              <input
                id="keyword-weight-value"
                type="number"
                min={0}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
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
              form="add-keyword-weight-form"
              className="segment-modal-btn segment-modal-btn-primary"
              disabled={!canSave}
            >
              Add keyword
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type EditKeywordWeightModalProps = {
  weight: KeywordWeight
  onClose: () => void
  onSave: (keyword: string, weight: number) => void
}

const EditKeywordWeightModal: React.FC<EditKeywordWeightModalProps> = ({ weight, onClose, onSave }) => {
  const [keyword, setKeyword] = useState(weight.keyword)
  const [value, setValue] = useState(String(weight.weight))

  const w = parseInt(value, 10)
  const canSave = keyword.trim() && !isNaN(w) && w >= 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(keyword.trim(), w)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="keyword-weights-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-keyword-weight-modal-title">
          <div className="segment-modal-header">
            <h2 id="edit-keyword-weight-modal-title" className="segment-modal-title">Edit keyword weight</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-keyword-weight-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-keyword-weight-keyword">
                Keyword <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-keyword-weight-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. price"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="edit-keyword-weight-value">
                Weight (points) <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-keyword-weight-value"
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
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
              form="edit-keyword-weight-form"
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
      <div className="keyword-weights-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-keyword-weight-title">
          <div className="segment-modal-header">
            <h2 id="delete-keyword-weight-title" className="segment-modal-title">Delete keyword</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">Are you sure you want to delete this keyword weight? This cannot be undone.</p>
          </div>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="segment-modal-btn segment-modal-btn-danger"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              Delete
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type KeywordWeightsToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const KeywordWeightsToast: React.FC<KeywordWeightsToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`keyword-weights-toast keyword-weights-toast-${type}`} role="status">
      <span className="keyword-weights-toast-message">{message}</span>
      <button type="button" className="keyword-weights-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}

type KeywordWeightCardProps = {
  weight: KeywordWeight
  onEdit?: () => void
  onDelete?: () => void
}

const KeywordWeightCard: React.FC<KeywordWeightCardProps> = ({ weight, onEdit, onDelete }) => {
  return (
    <div className="keyword-weight-card">
      <div className="keyword-weight-card-header">
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
      </div>
    </div>
  )
}
