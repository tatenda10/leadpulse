import React, { useEffect, useState } from 'react'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './ContactTags.css'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTags = async () => {
    if (!token) return
    try {
      const response = await apiRequest<TagsResponse>('/contacts/tags', { token })
      setTags(response.tags)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tags')
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
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tag')
    }
  }

  const saveTag = async (id: string, name: string, color: string) => {
    if (!token) return
    try {
      await apiRequest(`/contacts/tags/${id}`, { method: 'PATCH', body: { name, color }, token })
      await loadTags()
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tag')
    }
  }

  const addTag = async (name: string, color: string) => {
    if (!token) return
    try {
      await apiRequest('/contacts/tags', { method: 'POST', body: { name, color }, token })
      await loadTags()
      setIsAdding(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag')
    }
  }

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

      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      <div className="contact-tags-list">
        {isAdding && (
          <ContactTagCard
            isNew
            tag={{ id: 'new', name: '', color: TAG_COLORS[0], contactCount: 0 }}
            onSave={(name, color) => void addTag(name, color)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {tags.map((tag) => (
          <ContactTagCard
            key={tag.id}
            tag={tag}
            isEditing={editingId === tag.id}
            onEdit={() => setEditingId(tag.id)}
            onDelete={() => void deleteTag(tag.id)}
            onSave={(name, color) => void saveTag(tag.id, name, color)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>
    </div>
  )
}

type ContactTagCardProps = {
  tag: Tag
  isNew?: boolean
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (name: string, color: string) => void
  onCancel?: () => void
}

const ContactTagCard: React.FC<ContactTagCardProps> = ({ tag, isNew, isEditing, onEdit, onDelete, onSave, onCancel }) => {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    if (name.trim() && onSave) onSave(name.trim(), color)
  }

  return (
    <div className="contact-tag-card">
      <div className="contact-tag-header">
        {!canEdit ? (
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
        ) : (
          <>
            <span className="contact-tag-new-label">{isNew ? 'New tag' : 'Editing'}</span>
          </>
        )}
      </div>
      {canEdit && (
        <div className="contact-tag-body">
          <div className="contact-tag-field">
            <label>Tag name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. vip" />
          </div>
          <div className="contact-tag-field">
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
          <div className="contact-tag-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!name.trim()}>{isNew ? 'Add' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
