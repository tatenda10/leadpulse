import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineUserGroup, HiOutlineSearch, HiOutlineUserAdd, HiOutlineArrowLeft, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import './AllContacts.css'
import './ContactSegments.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type Contact = {
  id: string
  name: string
  phone: string
  score: number
  source: string
  lastContact: string
  waId?: string
}

type ContactsResponse = { contacts: Contact[] }
type ThresholdResponse = { warmThreshold: number; hotThreshold: number }

function getContactStatus(score: number, warm: number, hot: number): 'hot' | 'warm' | 'cold' {
  if (score >= hot) return 'hot'
  if (score >= warm) return 'warm'
  return 'cold'
}

type ContactFilter = 'all' | 'hot' | 'warm' | 'cold'

export const AllContacts: React.FC = () => {
  const { token } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warmThreshold, setWarmThreshold] = useState(40)
  const [hotThreshold, setHotThreshold] = useState(70)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
        setSelectedContactId((current) =>
          current && contactsResp.contacts.some((c) => c.id === current) ? current : contactsResp.contacts[0]?.id ?? null
        )
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

  const filteredContacts = useMemo(() => {
    let list = contacts
    switch (contactFilter) {
      case 'hot':
        list = list.filter((c) => getContactStatus(c.score, warmThreshold, hotThreshold) === 'hot')
        break
      case 'warm':
        list = list.filter((c) => getContactStatus(c.score, warmThreshold, hotThreshold) === 'warm')
        break
      case 'cold':
        list = list.filter((c) => getContactStatus(c.score, warmThreshold, hotThreshold) === 'cold')
        break
      default:
        break
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      )
    }
    return list
  }, [contacts, contactFilter, searchQuery, warmThreshold, hotThreshold])

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  )

  const isManualContact = Boolean(selectedContact?.waId?.startsWith('manual_'))

  useEffect(() => {
    setEditName(selectedContact?.name ?? '')
  }, [selectedContact?.id, selectedContact?.name])

  useEffect(() => {
    if (!selectedContactId) setIsMobileDetailOpen(false)
  }, [selectedContactId])

  const handleAddContact = async (name: string, phone: string) => {
    if (!token) return
    if (!name.trim() && !phone.trim()) return
    try {
      await apiRequest('/contacts', {
        method: 'POST',
        body: { name: name.trim(), phone: phone.trim() },
        token,
      })
      const refreshed = await apiRequest<ContactsResponse>('/contacts', { token })
      setContacts(refreshed.contacts)
      setSelectedContactId(refreshed.contacts[0]?.id ?? null)
      setIsAddModalOpen(false)
      setToast({ message: 'Contact added', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to add contact', type: 'error' })
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!token) return
    try {
      await apiRequest(`/contacts/${id}`, { method: 'DELETE', token })
      setContacts((prev) => prev.filter((c) => c.id !== id))
      if (selectedContactId === id) {
        const remaining = contacts.filter((c) => c.id !== id)
        setSelectedContactId(remaining[0]?.id ?? null)
        setIsMobileDetailOpen(false)
      }
      setDeleteConfirmId(null)
      setToast({ message: 'Contact deleted', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to delete contact', type: 'error' })
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
      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? { ...c, name: editName.trim() } : c))
      )
      setToast({ message: 'Contact updated', type: 'success' })
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Failed to save contact name', type: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className={`all-contacts ${isMobileDetailOpen ? 'mobile-detail-open' : ''}`}>
      {isAddModalOpen && (
        <AddContactModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={(name, phone) => void handleAddContact(name, phone)}
        />
      )}

      {deleteConfirmId && (
        <DeleteContactModal
          contactName={contacts.find((c) => c.id === deleteConfirmId)?.name ?? 'this contact'}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => void handleDeleteContact(deleteConfirmId)}
        />
      )}

      {toast && (
        <ContactsToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <aside className="contact-list">
        {error && (
          <div className="all-contacts-error" role="alert">
            {error}
          </div>
        )}
        <div className="contact-list-header">
          <div className="contact-list-header-main">
            {loading ? (
              <div className="skeleton contact-list-title-skeleton" />
            ) : (
              <span className="contact-list-title">Contacts</span>
            )}
            <div className="contact-list-right">
              {loading ? (
                <div className="skeleton contact-list-count-skeleton" />
              ) : (
                <>
                  <span className="contact-list-count">{filteredContacts.length}</span>
                  <button
                    type="button"
                    className="contact-add-btn-header"
                    onClick={() => setIsAddModalOpen(true)}
                    aria-label="Add contact"
                  >
                    <HiOutlineUserAdd size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="contact-search-wrap">
            {loading ? (
              <div className="skeleton contact-search-skeleton" />
            ) : (
              <>
                <HiOutlineSearch size={18} className="contact-search-icon" />
                <input
                  type="search"
                  className="contact-search-input"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search contacts"
                />
              </>
            )}
          </div>
          {!loading && (
          <div className="contact-filter-pills">
            <button
              type="button"
              className={`contact-filter-pill ${contactFilter === 'all' ? 'active' : ''}`}
              onClick={() => setContactFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`contact-filter-pill ${contactFilter === 'hot' ? 'active' : ''}`}
              onClick={() => setContactFilter('hot')}
            >
              Hot
            </button>
            <button
              type="button"
              className={`contact-filter-pill ${contactFilter === 'warm' ? 'active' : ''}`}
              onClick={() => setContactFilter('warm')}
            >
              Warm
            </button>
            <button
              type="button"
              className={`contact-filter-pill ${contactFilter === 'cold' ? 'active' : ''}`}
              onClick={() => setContactFilter('cold')}
            >
              Cold
            </button>
          </div>
          )}
        </div>
        <div className="contact-list-items">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="contact-item-skeleton-row">
                <div className="skeleton contact-item-avatar-skeleton" />
                <div className="contact-item-content-skeleton">
                  <div className="skeleton contact-item-name-skeleton" />
                  <div className="skeleton contact-item-meta-skeleton" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="contact-window-empty">
              <p>{error}</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="contact-window-empty">
              <p>No contacts match this filter</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const status = getContactStatus(contact.score, warmThreshold, hotThreshold)
              return (
                <button
                  key={contact.id}
                  type="button"
                  className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedContactId(contact.id)
                    setIsMobileDetailOpen(true)
                  }}
                >
                  <div className="contact-item-avatar">{contact.name.charAt(0) || '?'}</div>
                  <div className="contact-item-content">
                    <div className="contact-item-top">
                      <span className="contact-item-name">{contact.name}</span>
                    </div>
                    <div className="contact-item-meta">
                      <span className={`contact-item-tier ${status}`}>{status.toUpperCase()}</span>
                      <span className="contact-item-score">Score: {contact.score}</span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section className="contact-window">
        {loading ? (
          <>
            <div className="contact-window-skeleton-header">
              <div className="skeleton contact-window-avatar-skeleton" />
              <div className="skeleton contact-window-name-skeleton" />
            </div>
            <div className="contact-window-body-skeleton">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="skeleton contact-detail-field-skeleton" />
              ))}
            </div>
          </>
        ) : selectedContact ? (
          <>
            <div className="contact-window-header">
              <div className="contact-window-contact">
                <button
                  type="button"
                  className="contact-back-btn"
                  onClick={() => setIsMobileDetailOpen(false)}
                  aria-label="Back to list"
                >
                  <HiOutlineArrowLeft size={18} />
                </button>
                <div className="contact-window-avatar">
                  {selectedContact.name.charAt(0) || '?'}
                </div>
                <div>
                  <div className="contact-window-name">{selectedContact.name}</div>
                  <div className={`contact-window-tier ${getContactStatus(selectedContact.score, warmThreshold, hotThreshold)}`}>
                    {getContactStatus(selectedContact.score, warmThreshold, hotThreshold).toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="contact-window-actions">
                <button
                  type="button"
                  className="contact-delete-btn"
                  onClick={() => setDeleteConfirmId(selectedContact.id)}
                  aria-label="Delete contact"
                >
                  <HiOutlineTrash size={18} />
                  Delete
                </button>
              </div>
            </div>

            <div className="contact-detail-body">
              {isManualContact && (
                <div className="contact-edit-section">
                  <span className="contact-edit-label">Edit</span>
                  <div className="contact-edit-row">
                  <input
                    type="text"
                    className="contact-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Display name"
                    aria-label="Edit contact name"
                  />
                  <button
                    type="button"
                    className="contact-save-btn"
                    onClick={() => void handleSaveName()}
                    disabled={savingEdit || !editName.trim()}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
                </div>
              )}

              <div className="contact-detail-fields">
                <div className="contact-detail-field">
                  <span className="contact-field-label">Phone</span>
                  <span className="contact-field-value">{selectedContact.phone}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="contact-field-label">Score</span>
                  <span className="contact-field-value">{selectedContact.score}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="contact-field-label">Source</span>
                  <span className="contact-field-value">{selectedContact.source}</span>
                </div>
                <div className="contact-detail-field">
                  <span className="contact-field-label">Last contact</span>
                  <span className="contact-field-value">{selectedContact.lastContact}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="contact-window-empty">
            <HiOutlineUserGroup size={48} className="empty-icon" />
            <p>Select a contact</p>
          </div>
        )}
      </section>
    </div>
  )
}

type AddContactModalProps = {
  onClose: () => void
  onSave: (name: string, phone: string) => void
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const canSave = name.trim().length > 0 || phone.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave(name, phone)
  }

  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="all-contacts-modal-center">
        <div className="segment-modal" role="dialog" aria-modal="true" aria-labelledby="add-contact-modal-title">
          <div className="segment-modal-header">
            <h2 id="add-contact-modal-title" className="segment-modal-title">Add contact</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <form id="add-contact-form" onSubmit={handleSubmit} className="segment-modal-body">
            <div className="segment-modal-field">
              <label htmlFor="add-contact-name">Name</label>
              <input
                id="add-contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="segment-modal-field">
              <label htmlFor="add-contact-phone">
                Phone <span className="segment-field-required">*</span>
              </label>
              <input
                id="add-contact-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1234567890"
              />
            </div>
          </form>
          <footer className="segment-modal-footer">
            <button type="button" className="segment-modal-btn segment-modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-contact-form"
              className="segment-modal-btn segment-modal-btn-primary"
              disabled={!canSave}
            >
              Add contact
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body
  )
}

type DeleteContactModalProps = {
  contactName: string
  onClose: () => void
  onConfirm: () => void
}

const DeleteContactModal: React.FC<DeleteContactModalProps> = ({ contactName, onClose, onConfirm }) => {
  return createPortal(
    <>
      <div className="segment-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="all-contacts-modal-center">
        <div className="segment-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contact-modal-title">
          <div className="segment-modal-header">
            <h2 id="delete-contact-modal-title" className="segment-modal-title">Delete contact</h2>
            <button type="button" className="segment-modal-close" onClick={onClose} aria-label="Close">
              <HiOutlineX size={20} />
            </button>
          </div>
          <div className="segment-modal-body">
            <p className="delete-confirm-text">
              Are you sure you want to delete <strong>{contactName}</strong>? This cannot be undone.
            </p>
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

type ContactsToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const ContactsToast: React.FC<ContactsToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`all-contacts-toast all-contacts-toast-${type}`} role="status">
      <span className="all-contacts-toast-message">{message}</span>
      <button type="button" className="all-contacts-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}
