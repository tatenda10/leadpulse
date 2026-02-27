import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineDocumentText, HiOutlinePlus } from 'react-icons/hi'
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

export const ContactNotes: React.FC = () => {
  const { token } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [newContactId, setNewContactId] = useState('')
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [notesResp, contactsResp] = await Promise.all([
          apiRequest<NotesResponse>('/contacts/notes', { token }),
          apiRequest<ContactsResponse>('/contacts', { token }),
        ])
        if (cancelled) return
        setNotes(notesResp.notes)
        setContacts(contactsResp.contacts)
        setSelectedNoteId(notesResp.notes[0]?.id ?? null)
        setNewContactId(contactsResp.contacts[0]?.id ?? '')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load notes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [token])

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])

  const handleAddNote = async () => {
    if (!token || saving) return
    if (!newContactId || !newText.trim()) return

    setSaving(true)
    setError(null)
    try {
      await apiRequest('/contacts/notes', {
        method: 'POST',
        body: { contactId: newContactId, text: newText.trim() },
        token,
      })
      const refreshed = await apiRequest<NotesResponse>('/contacts/notes', { token })
      setNotes(refreshed.notes)
      setSelectedNoteId(refreshed.notes[0]?.id ?? null)
      setNewText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="contact-notes-page">
      <header className="contact-notes-header">
        <div>
          <h1 className="contact-notes-title">
            <HiOutlineDocumentText size={24} />
            Notes
          </h1>
          <p className="contact-notes-desc">
            Add and view notes on your contacts for follow-ups and context.
          </p>
        </div>
        <button type="button" className="contact-notes-add-btn" onClick={() => void handleAddNote()} disabled={saving || !newContactId || !newText.trim()}>
          <HiOutlinePlus size={18} />
          Add note
        </button>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: -8 }}>
        <select value={newContactId} onChange={(e) => setNewContactId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', minWidth: 220 }}>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Write a note..."
          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border-color)' }}
        />
      </div>

      <div className="contact-notes-layout">
        <aside className="contact-notes-list">
          <div className="contact-notes-count">{notes.length} notes</div>
          {loading ? (
            <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Loading notes...</div>
          ) : notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`note-row ${selectedNote?.id === note.id ? 'active' : ''}`}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <div className="note-row-contact">{note.contactName}</div>
              <div className="note-row-preview">{note.text}</div>
              <div className="note-row-meta">{note.createdAt} · {note.author}</div>
            </button>
          ))}
        </aside>
        <section className="contact-notes-detail">
          {selectedNote ? (
            <>
              <div className="note-detail-header">
                <h3 className="note-detail-contact">{selectedNote.contactName}</h3>
                <span className="note-detail-meta">{selectedNote.createdAt} · {selectedNote.author}</span>
              </div>
              <div className="note-detail-text">{selectedNote.text}</div>
            </>
          ) : (
            <div className="note-detail-empty">
              <HiOutlineDocumentText size={48} />
              <p>Select a note to view</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
