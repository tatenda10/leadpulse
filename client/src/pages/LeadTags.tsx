import React, { useEffect, useState } from 'react'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './LeadTags.css'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tag')
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
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tag')
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tag')
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

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="lead-tags-empty"><p>Loading tags...</p></div>
      ) : (
      <div className="lead-tags-list">
        {isAdding && (
          <TagCard
            isNew
            tag={{ id: 'new', name: '', color: TAG_COLORS[0] }}
            onSave={(name, color) => void addTag(name, color)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {tags.map((tag) => (
          <TagCard
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
      )}

      {tags.length === 0 && !isAdding && !loading && (
        <div className="lead-tags-empty">
          <HiOutlineTag size={48} className="empty-icon" />
          <p>No tags yet</p>
          <span className="empty-hint">Add tags to categorize and organize your leads</span>
          <button type="button" className="empty-add-btn" onClick={() => setIsAdding(true)}>
            <HiOutlinePlus size={18} />
            Add your first tag
          </button>
        </div>
      )}
    </div>
  )
}

type TagCardProps = {
  tag: Tag
  isNew?: boolean
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSave?: (name: string, color: string) => void
  onCancel?: () => void
}

const TagCard: React.FC<TagCardProps> = ({ tag, isNew, isEditing, onEdit, onDelete, onSave, onCancel }) => {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    if (name.trim() && onSave) onSave(name.trim(), color)
  }

  const canSave = name.trim().length > 0

  return (
    <div className="tag-card">
      <div className="tag-card-header">
        {!canEdit ? (
          <>
            <span className="tag-pill" style={{ backgroundColor: tag.color }}>{tag.name}</span>
            <div className="tag-actions">
              <button type="button" className="icon-btn" onClick={onEdit} title="Edit"><HiOutlinePencil size={16} /></button>
              <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete"><HiOutlineTrash size={16} /></button>
            </div>
          </>
        ) : (
          <span className="tag-new-label">{isNew ? 'New tag' : 'Editing'}</span>
        )}
      </div>
      {canEdit && (
        <div className="tag-card-body">
          <div className="tag-field">
            <label>Tag name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. high-intent" />
          </div>
          <div className="tag-field">
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
          <div className="tag-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!canSave}>{isNew ? 'Add' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
