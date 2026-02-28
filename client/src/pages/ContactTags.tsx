import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './ContactTags.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Tag = {
  id: string
  name: string
  color: string
  contactCount: number
}

const TAG_COLORS = ['#7c3aed', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899']

type TagsResponse = { tags: Tag[] }

export const ContactTags: React.FC = () => {
  const { token } = useAuth()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadTags = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await apiRequest<TagsResponse>('/contacts/tags', { token })
      setTags(response.tags)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTags()
  }, [token])

  const deleteTag = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/contacts/tags/${id}`, { method: 'DELETE', token })
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
      await apiRequest(`/contacts/tags/${id}`, { method: 'PATCH', body: { name, color }, token })
      await loadTags()
      setEditingTag(null)
      setToast({ message: 'Tag updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save tag', type: 'error' })
    }
  }

  const addTag = async (name: string, color: string) => {
    if (!token) return
    try {
      await apiRequest('/contacts/tags', { method: 'POST', body: { name, color }, token })
      await loadTags()
      setIsAdding(false)
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add tag', type: 'error' })
    }
  }

  if (loading)
    return (
      <div className="contact-tags-page">
        <header className="contact-tags-header">
          <div>
            <div className="skeleton contact-tags-title-skeleton" />
            <div className="skeleton contact-tags-desc-skeleton" />
          </div>
        </header>
        <div className="contact-tags-list">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="contact-tag-card contact-tag-card-skeleton">
              <div className="skeleton contact-tag-pill-skeleton" />
              <div className="skeleton contact-tag-count-skeleton" />
            </div>
          ))}
        </div>
      </div>
    )

  return (
    <div className="contact-tags-page">
      <header className="contact-tags-header">
        <div>
          <h1 className="contact-tags-title">
            <HiOutlineTag size={24} />
            Tags
          </h1>
          <p className="contact-tags-desc">
            Create tags to organize and filter your contacts.
          </p>
        </div>
        <button type="button" className="contact-tags-add-btn" onClick={() => setIsAdding(true)}>
          <HiOutlinePlus size={18} />
          Add tag
        </button>
      </header>

      {error && <div className="contact-tags-error">{error}</div>}

      {isAdding && (
        <AddContactTagModal
          onClose={() => setIsAdding(false)}
          onSave={(name, color) => void addTag(name, color)}
        />
      )}

      {editingTag && (
        <EditContactTagModal
          tag={editingTag}
          onClose={() => setEditingTag(null)}
          onSave={(name, color) => void saveTag(editingTag.id, name, color)}
        />
      )}

      {deleteConfirmId && (
        <DeleteContactTagModal
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => void deleteTag(deleteConfirmId)}
        />
      )}

      {toast && (
        <ContactTagsToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="contact-tags-list">
        {tags.map((tag) => (
          <ContactTagCard
            key={tag.id}
            tag={tag}
            onEdit={() => setEditingTag(tag)}
            onDelete={() => setDeleteConfirmId(tag.id)}
          />
        ))}
      </div>
    </div>
  )
}

type AddContactTagModalProps = {
  onClose: () => void
  onSave: (name: string, color: string) => void
}

const AddContactTagModal: React.FC<AddContactTagModalProps> = ({ onClose, onSave }) => {
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
      <div className="contact-tags-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-contact-tag-title">
          <div className="segment-modal-header">
            <h2 id="add-contact-tag-title" className="segment-modal-title">Add tag</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-contact-tag-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="contact-tag-name">
                Tag name <span className="segment-field-required">*</span>
              </label>
              <input
                id="contact-tag-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. vip"
              />
            </div>
            <div className="segment-modal-field">
              <label>Color</label>
              <div className="contact-tag-colors">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-btn ${color === c ? 'active' : ''}`}
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
              form="add-contact-tag-form"
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

type EditContactTagModalProps = {
  tag: Tag
  onClose: () => void
  onSave: (name: string, color: string) => void
}

const EditContactTagModal: React.FC<EditContactTagModalProps> = ({ tag, onClose, onSave }) => {
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
      <div className="contact-tags-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-contact-tag-title">
          <div className="segment-modal-header">
            <h2 id="edit-contact-tag-title" className="segment-modal-title">Edit tag</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="edit-contact-tag-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="edit-contact-tag-name">
                Tag name <span className="segment-field-required">*</span>
              </label>
              <input
                id="edit-contact-tag-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. vip"
              />
            </div>
            <div className="segment-modal-field">
              <label>Color</label>
              <div className="contact-tag-colors">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-btn ${color === c ? 'active' : ''}`}
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
              form="edit-contact-tag-form"
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

type DeleteContactTagModalProps = {
  onClose: () => void
  onConfirm: () => void
}

const DeleteContactTagModal: React.FC<DeleteContactTagModalProps> = ({ onClose, onConfirm }) => {
  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="contact-tags-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contact-tag-title">
          <div className="segment-modal-header">
            <h2 id="delete-contact-tag-title" className="segment-modal-title">Delete tag</h2>
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

type ContactTagsToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const ContactTagsToast: React.FC<ContactTagsToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`contact-tags-toast contact-tags-toast-${type}`} role="status">
      <span className="contact-tags-toast-message">{message}</span>
      <button type="button" className="contact-tags-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}

type ContactTagCardProps = {
  tag: Tag
  onEdit?: () => void
  onDelete?: () => void
}

const ContactTagCard: React.FC<ContactTagCardProps> = ({ tag, onEdit, onDelete }) => {
  return (
    <div className="contact-tag-card">
      <div className="contact-tag-header">
        <>
          <span className="contact-tag-pill" style={{ backgroundColor: tag.color }}>
            {tag.name}
          </span>
          <span className="contact-tag-count">{tag.contactCount} contacts</span>
          <div className="contact-tag-actions">
            <button type="button" className="icon-btn" onClick={onEdit}><HiOutlinePencil size={16} /></button>
            <button type="button" className="icon-btn danger" onClick={onDelete}><HiOutlineTrash size={16} /></button>
          </div>
        </>
      </div>
    </div>
  )
}
