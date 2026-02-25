import React, { useState } from 'react'
import { HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import './ContactTags.css'

type Tag = {
  id: string
  name: string
  color: string
  contactCount: number
}

const TAG_COLORS = ['#7c3aed', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899']

const MOCK_TAGS: Tag[] = [
  { id: '1', name: 'vip', color: '#ef4444', contactCount: 12 },
  { id: '2', name: 'callback-requested', color: '#f59e0b', contactCount: 32 },
  { id: '3', name: 'catalogue-sent', color: '#22c55e', contactCount: 89 },
  { id: '4', name: 'facebook-lead', color: '#3b82f6', contactCount: 156 },
]

export const ContactTags: React.FC = () => {
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
    setTags((prev) => [
      { id: String(Date.now()), name, color, contactCount: 0 },
      ...prev,
    ])
    setIsAdding(false)
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
        <button
          type="button"
          className="contact-tags-add-btn"
          onClick={() => setIsAdding(true)}
        >
          <HiOutlinePlus size={18} />
          Add tag
        </button>
      </header>

      <div className="contact-tags-list">
        {isAdding && (
          <ContactTagCard
            isNew
            tag={{ id: 'new', name: '', color: TAG_COLORS[0], contactCount: 0 }}
            onSave={(name, color) => addTag(name, color)}
            onCancel={() => setIsAdding(false)}
          />
        )}
        {tags.map((tag) => (
          <ContactTagCard
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

const ContactTagCard: React.FC<ContactTagCardProps> = ({
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
              <button type="button" className="icon-btn" onClick={onEdit}>
                <HiOutlinePencil size={16} />
              </button>
              <button type="button" className="icon-btn danger" onClick={onDelete}>
                <HiOutlineTrash size={16} />
              </button>
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
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. vip"
            />
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
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
              {isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
