import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineTrash,
} from 'react-icons/hi'
import './ContactNotes.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Note = {
  id: string
  contactName: string
  contactId: string
  text: string
  author: string
  createdAt: string
}

type Contact = {
  id: string
  name: string
  phone: string
  score: number
  source: string
  lastContact: string
}

type NotesResponse = { notes: Note[] }
type ContactsResponse = { contacts: Contact[] }

type ToastState = { message: string; type: 'success' | 'error' } | null

export const ContactNotes: React.FC = () => {
  const { token } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!token) return
      setLoading(true)
      try {
        const [notesResp, contactsResp] = await Promise.all([
          apiRequest<NotesResponse>('/contacts/notes', { token }),
          apiRequest<ContactsResponse>('/contacts', { token }),
        ])
        if (cancelled) return
        setNotes(notesResp.notes)
        setContacts(contactsResp.contacts)
        setSelectedNoteId(notesResp.notes[0]?.id ?? null)
      } catch (e) {
        if (!cancelled) setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load notes' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [token])

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.contactName.toLowerCase().includes(q) ||
        n.text.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  )

  const handleAddNote = async (contactId: string, text: string) => {
    if (!token || !contactId || !text.trim()) return
    try {
      await apiRequest('/contacts/notes', {
        method: 'POST',
        body: { contactId, text: text.trim() },
        token,
      })
      const refreshed = await apiRequest<NotesResponse>('/contacts/notes', { token })
      setNotes(refreshed.notes)
      setSelectedNoteId(refreshed.notes[0]?.id ?? null)
      setIsAddModalOpen(false)
      setToast({ type: 'success', message: 'Note added' })
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to add note' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/contacts/notes/${id}`, { method: 'DELETE', token })
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedNoteId === id) {
        const remaining = notes.filter((n) => n.id !== id)
        setSelectedNoteId(remaining[0]?.id ?? null)
      }
      setDeleteConfirmId(null)
      setToast({ type: 'success', message: 'Note deleted' })
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to delete note' })
    }
  }

  return (
    <div className="contact-notes-page">
      {isAddModalOpen && (
        <AddNoteModal
          contacts={contacts}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(contactId, text) => void handleAddNote(contactId, text)}
        />
      )}

      {deleteConfirmId && (
        <DeleteNoteModal
          notePreview={notes.find((n) => n.id === deleteConfirmId)?.text?.slice(0, 50) ?? ''}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => void handleDeleteNote(deleteConfirmId)}
        />
      )}

      {toast && (
        <NotesToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="contact-notes-header">
        <div>
          {loading ? (
            <>
              <div className="skeleton contact-notes-title-skeleton" />
              <div className="skeleton contact-notes-desc-skeleton" />
            </>
          ) : (
            <>
              <h1 className="contact-notes-title">
                <HiOutlineDocumentText size={24} />
                Notes
              </h1>
              <p className="contact-notes-desc">
                Add and view notes on your contacts for follow-ups and context.
              </p>
            </>
          )}
        </div>
        {!loading && (
          <button
            type="button"
            className="contact-notes-add-btn"
            onClick={() => setIsAddModalOpen(true)}
            disabled={contacts.length === 0}
          >
            <HiOutlinePlus size={18} />
            Add note
          </button>
        )}
      </header>

      <div className="contact-notes-layout">
        <aside className="contact-notes-list">
          <div className="contact-notes-list-header">
            {loading ? (
              <>
                <div className="skeleton contact-notes-count-skeleton" />
                <div className="skeleton contact-notes-search-skeleton" />
              </>
            ) : (
              <>
                <span className="contact-notes-count">{filteredNotes.length} notes</span>
                <div className="contact-notes-search-wrap">
                  <HiOutlineSearch size={18} className="contact-notes-search-icon" />
                  <input
                    type="search"
                    className="contact-notes-search-input"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search notes"
                  />
                </div>
              </>
            )}
          </div>
          {loading ? (
            <div className="contact-notes-list-items">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="note-row-skeleton">
                  <div className="skeleton note-row-contact-skeleton" />
                  <div className="skeleton note-row-preview-skeleton" />
                  <div className="skeleton note-row-meta-skeleton" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="contact-notes-empty">
              {searchQuery.trim() ? 'No notes match your search' : 'No notes yet. Add one to get started.'}
            </div>
          ) : (
            <div className="contact-notes-list-items">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={`note-row ${selectedNote?.id === note.id ? 'active' : ''}`}
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  <div className="note-row-contact">{note.contactName}</div>
                  <div className="note-row-preview">{note.text}</div>
                  <div className="note-row-meta">{note.createdAt} ù {note.author}</div>
                </button>
              ))}
            </div>
          )}
        </aside>
        <section className="contact-notes-detail">
          {loading ? (
            <>
              <div className="note-detail-header-skeleton">
                <div className="skeleton note-detail-contact-skeleton" />
                <div className="skeleton note-detail-meta-skeleton-block" />
              </div>
              <div className="skeleton note-detail-text-skeleton" />
            </>
          ) : selectedNote ? (
            <>
              <div className="note-detail-header">
                <div>
                  <h3 className="note-detail-contact">{selectedNote.contactName}</h3>
                  <span className="note-detail-meta">{selectedNote.createdAt} ù {selectedNote.author}</span>
                </div>
                <button
                  type="button"
                  className="note-detail-delete-btn"
                  onClick={() => setDeleteConfirmId(selectedNote.id)}
                  aria-label="Delete note"
                >
                  <HiOutlineTrash size={18} />
                  Delete
                </button>
              </div>
              <div className="note-detail-text">{selectedNote.text}</div>
            </>
          ) : (
            <div className="note-detail-empty">
              <HiOutlineDocumentText size={48} className="note-detail-empty-icon" />
              <p>Select a note to view</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

type AddNoteModalProps = {
  contacts: Contact[]
  onClose: () => void
  onSave: (contactId: string, text: string) => void
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ contacts, onClose, onSave }) => {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '')
  const [text, setText] = useState('')

  React.useEffect(() => {
    if (contacts.length && !contactId) setContactId(contacts[0].id)
  }, [contacts, contactId])

  const canSave = Boolean(contactId && text.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(contactId, text)
  }

  return createPortal(
    <>
      <div className="notes-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="notes-modal-center">
        <div className="notes-modal" role="dialog" aria-modal="true" aria-labelledby="add-note-modal-title">
          <div className="notes-modal-header">
            <h2 id="add-note-modal-title" className="notes-modal-title">Add note</h2>
            <button type="button" className="notes-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-note-form" onSubmit={handleSubmit} className="notes-modal-body">
            <div className="notes-modal-field">
              <label htmlFor="add-note-contact">Contact <span className="notes-field-required">*</span></label>
              <select
                id="add-note-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="notes-modal-field">
              <label htmlFor="add-note-text">Note <span className="notes-field-required">*</span></label>
              <textarea
                id="add-note-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a note..."
                rows={4}
              />
            </div>
          </form>
          <footer className="notes-modal-footer">
            <button type="button" className="notes-modal-btn notes-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-note-form"
              className="notes-modal-btn notes-modal-btn-primary"
              disabled={!canSave}
            >
              Add note
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type DeleteNoteModalProps = {
  notePreview: string
  onClose: () => void
  onConfirm: () => void
}

const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({ notePreview, onClose, onConfirm }) => {
  return createPortal(
    <>
      <div className="notes-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="notes-modal-center">
        <div className="notes-modal notes-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-note-modal-title">
          <div className="notes-modal-header">
            <h2 id="delete-note-modal-title" className="notes-modal-title">Delete note</h2>
            <button type="button" className="notes-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="notes-modal-body">
            <p className="notes-delete-text">
              Are you sure you want to delete this note?
              {notePreview && <span className="notes-delete-preview"> "{notePreview}{notePreview.length >= 50 ? 'ù' : ''}"</span>}
            </p>
          </div>
          <footer className="notes-modal-footer">
            <button type="button" className="notes-modal-btn notes-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="notes-modal-btn notes-modal-btn-danger"
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

type NotesToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const NotesToast: React.FC<NotesToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`notes-toast notes-toast-${type}`} role="status">
      <span className="notes-toast-message">{message}</span>
      <button type="button" className="notes-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}
