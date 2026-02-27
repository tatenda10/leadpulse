import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineUserGroup, HiOutlineSearch, HiOutlinePlus } from 'react-icons/hi'
import './AllContacts.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Contact = {
  id: string
  name: string
  phone: string
  score: number
  source: string
  lastContact: string
}

type ContactsResponse = { contacts: Contact[] }
type ThresholdResponse = { warmThreshold: number; hotThreshold: number }

function getContactStatus(score: number, warm: number, hot: number): 'hot' | 'warm' | 'cold' {
  if (score >= hot) return 'hot'
  if (score >= warm) return 'warm'
  return 'cold'
}

export const AllContacts: React.FC = () => {
  const { token } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warmThreshold, setWarmThreshold] = useState(40)
  const [hotThreshold, setHotThreshold] = useState(70)

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [contactsResp, thresholdResp] = await Promise.all([
          apiRequest<ContactsResponse>('/contacts', { token }),
          apiRequest<ThresholdResponse>('/settings/hot-lead-threshold', { token }),
        ])
        if (cancelled) return

        setContacts(contactsResp.contacts)
        setWarmThreshold(thresholdResp.warmThreshold)
        setHotThreshold(thresholdResp.hotThreshold)
        setSelectedContactId((current) => current && contactsResp.contacts.some((c) => c.id === current) ? current : contactsResp.contacts[0]?.id ?? null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load contacts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [token])

  const filteredContacts = useMemo(
    () => contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)),
    [contacts, search]
  )

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  )

  useEffect(() => {
    setEditName(selectedContact?.name || '')
  }, [selectedContact?.id, selectedContact?.name])

  const handleAddContact = async () => {
    if (!token || savingNew) return
    if (!newName.trim() && !newPhone.trim()) return

    setSavingNew(true)
    setError(null)
    try {
      await apiRequest('/contacts', {
        method: 'POST',
        body: { name: newName.trim(), phone: newPhone.trim() },
        token,
      })
      const refreshed = await apiRequest<ContactsResponse>('/contacts', { token })
      setContacts(refreshed.contacts)
      setSelectedContactId(refreshed.contacts[0]?.id ?? null)
      setNewName('')
      setNewPhone('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add contact')
    } finally {
      setSavingNew(false)
    }
  }

  const handleSaveName = async () => {
    if (!token || !selectedContact || savingEdit) return
    if (!editName.trim()) return

    setSavingEdit(true)
    setError(null)
    try {
      await apiRequest(`/contacts/${selectedContact.id}`, {
        method: 'PATCH',
        body: { displayName: editName.trim() },
        token,
      })
      setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? { ...c, name: editName.trim() } : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save contact name')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="all-contacts-page">
      <header className="all-contacts-header">
        <div>
          <h1 className="all-contacts-title">
            <HiOutlineUserGroup size={24} />
            All Contacts
          </h1>
          <p className="all-contacts-desc">
            View incoming contacts, add manual contacts, and update contact names.
          </p>
        </div>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      <div className="all-contacts-layout">
        <aside className="all-contacts-list">
          <div className="all-contacts-search">
            <HiOutlineSearch size={18} />
            <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ flex: 1, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}
            />
            <input
              type="text"
              placeholder="Phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              style={{ flex: 1, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() => void handleAddContact()}
              disabled={savingNew || (!newName.trim() && !newPhone.trim())}
              style={{ border: 'none', background: 'var(--text-accent)', color: '#fff', borderRadius: 8, padding: '0 10px' }}
            >
              <HiOutlinePlus size={16} />
            </button>
          </div>

          <div className="all-contacts-count">{filteredContacts.length} contacts</div>
          <div className="all-contacts-items">
            {loading ? (
              <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Loading contacts...</div>
            ) : (
              filteredContacts.map((contact) => {
                const status = getContactStatus(contact.score, warmThreshold, hotThreshold)
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`contact-row ${selectedContact?.id === contact.id ? 'active' : ''}`}
                    onClick={() => setSelectedContactId(contact.id)}
                  >
                    <div className="contact-row-avatar">{contact.name.charAt(0)}</div>
                    <div className="contact-row-content">
                      <span className="contact-row-name">{contact.name}</span>
                      <span className="contact-row-meta">Score: {contact.score} · {status}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>
        <section className="all-contacts-detail">
          {selectedContact ? (
            <>
              <div className="contact-detail-header">
                <div className="contact-detail-avatar">{selectedContact.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <h2 className="contact-detail-name">{selectedContact.name}</h2>
                  <span className={`contact-detail-status ${getContactStatus(selectedContact.score, warmThreshold, hotThreshold)}`}>
                    {getContactStatus(selectedContact.score, warmThreshold, hotThreshold)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Rename contact"
                  style={{ flex: 1, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8 }}
                />
                <button
                  type="button"
                  onClick={() => void handleSaveName()}
                  disabled={savingEdit || !editName.trim()}
                  style={{ border: 'none', background: 'var(--text-accent)', color: '#fff', borderRadius: 8, padding: '0 12px' }}
                >
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
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
