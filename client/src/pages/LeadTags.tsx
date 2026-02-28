import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './LeadTags.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Tag = {
  id: string
  name: string
  color: string
}

type TagsResponse = { tags: Tag[] }
type TagResponse = { tag: Tag }

const TAG_COLORS = ['#7c3aed', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899']

export const LeadTags: React.FC = () => {
  const { token } = useAuth()
  const [tags, setTags] = useState<Tag[]>([])
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTags() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<TagsResponse>('/settings/lead-tags', { token })
        if (!cancelled) setTags(response.tags)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tags')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadTags()
    return () => {
      cancelled = true
    }
  }, [token])

  const deleteTag = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/settings/lead-tags/${id}`, { method: 'DELETE', token })
      setTags((prev) => prev.filter((t) => t.id !== id))
      setDeleteConfirmId(null)
      setToast({ message: 'Tag deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete tag', type: 'error' })
    }
  }

  const saveTag = async (id: string, name: string, color: string) => {
    if (!token) return
    try {
      const response = await apiRequest<TagResponse>(`/settings/lead-tags/${id}`, {
        method: 'PATCH',
        body: { name, color },
        token,
      })
      setTags((prev) => prev.map((t) => (t.id === id ? response.tag : t)))
      setEditingTag(null)
      setToast({ message: 'Tag updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save tag', type: 'error' })
    }
  }

  const addTag = async (name: string, color: string) => {
    if (!token) return
    try {
      const response = await apiRequest<TagResponse>('/settings/lead-tags', {
        method: 'POST',
        body: { name, color },
        token,
      })
      setTags((prev) => [response.tag, ...prev])
      setIsAdding(false)
      setToast({ message: 'Tag added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add tag', type: 'error' })
    }
  }

  return (
    <div className="lead-tags-page">
      <header className="lead-tags-header">
        <div>
          <h1 className="lead-tags-title">
            <HiOutlineTag size={24} />
            Tags
          </h1>
          <p className="lead-tags-desc">
            Create and manage tags to organize leads and filter conversations.
          </p>
        </div>
        <button type="button" className="lead-tags-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add tag
        </button>
      </header>

      {error && <div className="lead-tags-error">{error}</div>}

      {isAdding && (
        <AddLeadTagModal
          onClose={() => setIsAdding(false)}
          onSave={(name, color) => void addTag(name, color)}
        />
      )}

      {editingTag && (
        <EditLeadTagModal
          tag={editingTag}
          onClose={() => setEditingTag(null)}
          onSave={(name, color) => void saveTag(editingTag.id, name, color)}
        />
      )}

      {deleteConfirmId && (
        <DeleteLeadTagModal
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => void deleteTag(deleteConfirmId)}
        />
      )}

      {toast && (
        <LeadTagsToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <div className="lead-tags-empty"><p>Loading tags...</p></div>
      ) : tags.length === 0 && !isAdding ? (
        <div className="lead-tags-empty">
          <HiOutlineTag size={48} className="empty-icon" />
          <p>No tags yet</p>
          <span className="empty-hint">Add tags to categorize and organize your leads</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first tag
          </button>
        </div>
      ) : (
        <div className="lead-tags-list">
          {tags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onEdit={() => setEditingTag(tag)}
              onDelete={() => setDeleteConfirmId(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type AddLeadTagModalProps = {
  onClose: () => void
  onSave: (name: string, color: string) => void
}

const AddLeadTagModal: React.FC<AddLeadTagModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])

  const canSave = name.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(name.trim(), color)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="lead-tags-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-lead-tag-title">
          <div className="segment-modal-header">
            <h2 id="add-lead-tag-title" className="segment-modal-title">Add tag</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-lead-tag-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="lead-tag-name">
                Tag name <span className="segment-field-required">*</span>
              </label>
              <input
                id="lead-tag-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. high-intent"
              />
            </div>
            <div className="segment-modal-field">
              <label>Color</label>
              <div className="tag-color-options">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tag-color-btn ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-lead-tag-form"
              className="segment-modal-btn segment-modal-btn-primary"
              disabled={!canSave}
            >
              Add tag
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type EditLeadTagModalProps = {
  tag: Tag
  onClose: () => void
  onSave: (name: string, color: string) => void
}

const EditLeadTagModal: React.FC<EditLeadTagModalProps> = ({ tag, onClose, onSave }) => {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)

  const canSave = name.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(name.trim(), color)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="lead-tags-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-lead-tag-title">
          <div className="segment-modal-header">
            <h2 id="edit-lead-tag-title" className="segment-modal-title">Edit tag</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-lead-tag-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-lead-tag-name">
                Tag name <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-lead-tag-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. high-intent"
              />
            </div>
            <div className="segment-modal-field">
              <label>Color</label>
              <div className="tag-color-options">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tag-color-btn ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-lead-tag-form"
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

type DeleteLeadTagModalProps = {
  onClose: () => void
  onConfirm: () => void
}

const DeleteLeadTagModal: React.FC<DeleteLeadTagModalProps> = ({ onClose, onConfirm }) => {
  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="lead-tags-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-lead-tag-title">
          <div className="segment-modal-header">
            <h2 id="delete-lead-tag-title" className="segment-modal-title">Delete tag</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">Are you sure you want to delete this tag? This cannot be undone.</p>
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

type LeadTagsToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const LeadTagsToast: React.FC<LeadTagsToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`lead-tags-toast lead-tags-toast-${type}`} role="status">
      <span className="lead-tags-toast-message">{message}</span>
      <button type="button" className="lead-tags-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}

type TagCardProps = {
  tag: Tag
  onEdit?: () => void
  onDelete?: () => void
}

const TagCard: React.FC<TagCardProps> = ({ tag, onEdit, onDelete }) => {
  return (
    <div className="tag-card">
      <div className="tag-card-header">
        <span className="tag-pill" style={{ backgroundColor: tag.color }}>{tag.name}</span>
        <div className="tag-actions">
          <button type="button" className="icon-btn" onClick={onEdit} title="Edit"><HiOutlinePencil size={16} /></button>
          <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete"><HiOutlineTrash size={16} /></button>
        </div>
      </div>
    </div>
  )
}
