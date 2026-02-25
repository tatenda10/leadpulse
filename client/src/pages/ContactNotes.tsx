import React, { useState } from 'react'
import { HiOutlineDocumentText, HiOutlinePlus } from 'react-icons/hi'
import './ContactNotes.css'

type Note = {
  id: string
  contactName: string
  contactId: string
  text: string
  author: string
  createdAt: string
}

const MOCK_NOTES: Note[] = [
  { id: '1', contactName: 'John Mbanga', contactId: '1', text: 'Interested in bulk pricing. Will call back tomorrow.', author: 'You', createdAt: 'Today, 10:45' },
  { id: '2', contactName: 'Sarah Ncube', contactId: '2', text: 'Sent catalogue. Follow up in 3 days.', author: 'You', createdAt: 'Yesterday, 14:20' },
  { id: '3', contactName: 'Grace Mutasa', contactId: '3', text: 'Hot lead - requested quote for 50 units.', author: 'Sarah K', createdAt: '2 days ago' },
]

export const ContactNotes: React.FC = () => {
  const [notes] = useState<Note[]>(MOCK_NOTES)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

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
        <button type="button" className="contact-notes-add-btn">
          <HiOutlinePlus size={18} />
          Add note
        </button>
      </header>

      <div className="contact-notes-layout">
        <aside className="contact-notes-list">
          <div className="contact-notes-count">{notes.length} notes</div>
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`note-row ${selectedNote?.id === note.id ? 'active' : ''}`}
              onClick={() => setSelectedNote(note)}
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
