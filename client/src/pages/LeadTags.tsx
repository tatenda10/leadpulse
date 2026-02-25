import React, { useState } from 'react'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './LeadTags.css'

type Tag = {
  id: string
  name: string
  color: string
}

const TAG_COLORS = ['#7c3aed', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899']

const MOCK_TAGS: Tag[] = [
  { id: '1', name: 'high-intent', color: '#ef4444' },
  { id: '2', name: 'facebook-ad', color: '#3b82f6' },
  { id: '3', name: 'callback-requested', color: '#f59e0b' },
  { id: '4', name: 'catalogue-sent', color: '#22c55e' },
]

export const LeadTags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>(MOCK_TAGS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const deleteTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id))
    setEditingId(null)
  }

  const saveTag = (id: string, name: string, color: string) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name, color } : t))
    )
    setEditingId(null)
  }

  const addTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: String(Date.now()),
      name,
      color,
    }
    setTags((prev) => [newTag, ...prev])
    setIsAdding(false)
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
        <button
          type="button"
          className="lead-tags-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add tag
        </button>
      </header>

      <div className="lead-tags-list">
        {isAdding && (
          <TagCard
            isNew
            tag={{ id: 'new', name: '', color: TAG_COLORS[0] }}
            onSave={(name, color) => addTag(name, color)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            isEditing={editingId === tag.id}
            onEdit={() => setEditingId(tag.id)}
            onDelete={() => deleteTag(tag.id)}
            onSave={(name, color) => saveTag(tag.id, name, color)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>

      {tags.length === 0 && !isAdding && (
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

const TagCard: React.FC<TagCardProps> = ({
  tag,
  isNew,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const canEdit = isNew ?? isEditing

  const handleSave = () => {
    if (name.trim() && onSave) {
      onSave(name.trim(), color)
    }
  }

  const canSave = name.trim().length > 0

  return (
    <div className="tag-card">
      <div className="tag-card-header">
        {!canEdit ? (
          <>
            <span className="tag-pill" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </span>
            <div className="tag-actions">
              <button type="button" className="icon-btn" onClick={onEdit} title="Edit">
                <HiOutlinePencil size={16} />
              </button>
              <button type="button" className="icon-btn danger" onClick={onDelete} title="Delete">
                <HiOutlineTrash size={16} />
              </button>
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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. high-intent"
            />
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
