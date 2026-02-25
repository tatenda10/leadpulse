import React, { useState } from 'react'
import { HiOutlineUserGroup, HiOutlineSearch } from 'react-icons/hi'
import './AllContacts.css'

type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  score: number
  status: 'hot' | 'warm' | 'cold'
  source: string
  lastContact: string
}

const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'John Mbanga', phone: '+263 77 123 4567', score: 92, status: 'hot', source: 'Facebook Ads', lastContact: '2h ago' },
  { id: '2', name: 'Sarah Ncube', phone: '+263 71 987 6543', score: 45, status: 'warm', source: 'WhatsApp Link', lastContact: '5h ago' },
  { id: '3', name: 'Grace Mutasa', phone: '+263 71 333 4444', score: 78, status: 'hot', source: 'Facebook Ads', lastContact: '1d ago' },
  { id: '4', name: 'Mike Dube', phone: '+263 77 111 2222', score: 32, status: 'cold', source: 'Organic', lastContact: '2d ago' },
  { id: '5', name: 'Linda Moyo', phone: '+263 71 777 6666', score: 55, status: 'warm', source: 'Facebook Ads', lastContact: '3d ago' },
]

export const AllContacts: React.FC = () => {
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  return (
    <div className="all-contacts-page">
      <header className="all-contacts-header">
        <div>
          <h1 className="all-contacts-title">
            <HiOutlineUserGroup size={24} />
            All Contacts
          </h1>
          <p className="all-contacts-desc">
            View and manage your lead and customer contacts.
          </p>
        </div>
      </header>

      <div className="all-contacts-layout">
        <aside className="all-contacts-list">
          <div className="all-contacts-search">
            <HiOutlineSearch size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="all-contacts-count">{filteredContacts.length} contacts</div>
          <div className="all-contacts-items">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className={`contact-row ${selectedContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="contact-row-avatar">{contact.name.charAt(0)}</div>
                <div className="contact-row-content">
                  <span className="contact-row-name">{contact.name}</span>
                  <span className="contact-row-meta">
                    Score: {contact.score} · {contact.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <section className="all-contacts-detail">
          {selectedContact ? (
            <>
              <div className="contact-detail-header">
                <div className="contact-detail-avatar">{selectedContact.name.charAt(0)}</div>
                <div>
                  <h2 className="contact-detail-name">{selectedContact.name}</h2>
                  <span className={`contact-detail-status ${selectedContact.status}`}>
                    {selectedContact.status}
                  </span>
                </div>
              </div>
              <div className="contact-detail-fields">
                <div className="contact-detail-field">
                  <span className="field-label">Phone</span>
                  <span className="field-value">{selectedContact.phone}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="field-label">Score</span>
                  <span className="field-value">{selectedContact.score}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="field-label">Source</span>
                  <span className="field-value">{selectedContact.source}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="field-label">Last contact</span>
                  <span className="field-value">{selectedContact.lastContact}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="contact-detail-empty">
              <HiOutlineUserGroup size={48} />
              <p>Select a contact to view details</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
