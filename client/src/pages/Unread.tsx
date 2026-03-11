import React, { useEffect, useState } from 'react'
import { HiOutlineFire, HiOutlineChip, HiOutlineUser, HiOutlineInbox } from 'react-icons/hi'
import './AllChats.css'
import './Unread.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import { useUnreadCount } from '../contexts/UnreadCountContext'
import { getEffectiveUnreadCount, markConversationReadLocally } from '../utils/conversationReadState'

type Chat = {
  id: string
  contact: string
  phone: string
  lastMessage: string
  time: string
  lastMessageAt: string | null
  unread: number
  status: 'bot' | 'human'
  isHot: boolean
}

type ConversationsResponse = {
  conversations: Array<{
    id: string
    contact: string
    phone: string
    lastMessage: string
    lastMessageAt: string | null
    unread: number
    status: 'bot' | 'human'
    isHot: boolean
  }>
}

function formatRelativeTime(value: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString()
}

type UnreadProps = {
  onOpenConversation?: (conversationId: string) => void
}

export const Unread: React.FC<UnreadProps> = ({ onOpenConversation }) => {
  const { token } = useAuth()
  const { setUnreadCount } = useUnreadCount()
  const [unreadChats, setUnreadChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [markingChatId, setMarkingChatId] = useState<string | null>(null)

  useEffect(() => {
    setUnreadCount(unreadChats.reduce((sum, chat) => sum + chat.unread, 0))
  }, [unreadChats, setUnreadCount])

  useEffect(() => {
    let cancelled = false

    async function loadUnread() {
      if (!token) {
        setUnreadChats([])
        setUnreadCount(0)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await apiRequest<ConversationsResponse>('/conversations', { token })
        if (cancelled) return

        const nextUnread: Chat[] =
          res.conversations
            ?.map((c) => ({
              ...c,
              unread: getEffectiveUnreadCount(c.id, c.unread ?? 0, c.lastMessageAt),
            }))
            .filter((c) => (c.unread ?? 0) > 0)
            .map((c) => ({
              id: c.id,
              contact: c.contact,
              phone: c.phone,
              lastMessage: c.lastMessage || 'No messages yet',
              time: formatRelativeTime(c.lastMessageAt),
              lastMessageAt: c.lastMessageAt,
              unread: c.unread,
              status: c.status,
              isHot: c.isHot,
            })) ?? []

        setUnreadChats(nextUnread)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load unread conversations')
          setUnreadChats([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadUnread()

    return () => {
      cancelled = true
    }
  }, [token, setUnreadCount])

  const handleMarkRead = async (chatId: string) => {
    if (!token || markingChatId || markingAllRead) return

    const previousChats = unreadChats
    setMarkingChatId(chatId)
    setError(null)
    setUnreadChats((prev) => prev.filter((chat) => chat.id !== chatId))
    const target = previousChats.find((chat) => chat.id === chatId)
    markConversationReadLocally(chatId, target?.lastMessageAt ?? null)
    try {
      await apiRequest(`/conversations/${chatId}`, {
        method: 'PATCH',
        body: { markRead: true },
        token,
      })
    } catch (e) {
      setUnreadChats(previousChats)
      setError(e instanceof Error ? e.message : 'Failed to mark conversation as read')
    } finally {
      setMarkingChatId(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (!token || unreadChats.length === 0 || markingAllRead) return

    const previousChats = unreadChats
    setMarkingAllRead(true)
    setError(null)
    setUnreadChats([])
    previousChats.forEach((chat) => markConversationReadLocally(chat.id, chat.lastMessageAt))
    try {
      await Promise.all(
        previousChats.map((chat) =>
          apiRequest(`/conversations/${chat.id}`, {
            method: 'PATCH',
            body: { markRead: true },
            token,
          })
        )
      )
    } catch (e) {
      setUnreadChats(previousChats)
      setError(e instanceof Error ? e.message : 'Failed to mark all conversations as read')
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleOpenConversation = async (chatId: string) => {
    if (!token || markingAllRead || Boolean(markingChatId)) return

    const previousChats = unreadChats
    setMarkingChatId(chatId)
    setError(null)
    setUnreadChats((prev) => prev.filter((chat) => chat.id !== chatId))
    const target = previousChats.find((chat) => chat.id === chatId)
    markConversationReadLocally(chatId, target?.lastMessageAt ?? null)
    onOpenConversation?.(chatId)
    try {
      await apiRequest(`/conversations/${chatId}`, {
        method: 'PATCH',
        body: { markRead: true },
        token,
      })
    } catch (e) {
      setUnreadChats(previousChats)
      setError(e instanceof Error ? e.message : 'Failed to open conversation')
    } finally {
      setMarkingChatId(null)
    }
  }

  return (
    <div className="unread-page">
      <div className="unread-list">
        <div className="chat-list-header">
          <span className="chat-list-title">Unread</span>
          {unreadChats.length > 0 && (
            <button type="button" className="unread-mark-btn" onClick={handleMarkAllRead} disabled={markingAllRead || Boolean(markingChatId)}>
              {markingAllRead ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>
        <div className="chat-list-items">
          {loading ? (
            <div className="unread-empty-list">
              <p>Loading unread conversations...</p>
            </div>
          ) : error ? (
            <div className="unread-empty-list">
              <p>{error}</p>
            </div>
          ) : unreadChats.length === 0 ? (
            <div className="unread-empty-list">
              <HiOutlineInbox size={40} className="empty-icon" />
              <p>No unread conversations</p>
              <span className="unread-empty-hint">All caught up!</span>
            </div>
          ) : (
            unreadChats.map((chat) => (
              <div
                key={chat.id}
                className="chat-item unread"
                onClick={() => {
                  if (markingAllRead || markingChatId === chat.id) return
                  void handleOpenConversation(chat.id)
                }}
                onKeyDown={(e) => {
                  if (markingAllRead || markingChatId === chat.id) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void handleOpenConversation(chat.id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-disabled={markingAllRead || markingChatId === chat.id}
              >
                <div className="chat-item-avatar">
                  {chat.contact.charAt(0)}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-top">
                    <span className="chat-item-contact">{chat.contact}</span>
                    <span className="chat-item-time">{chat.time}</span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">{chat.lastMessage}</span>
                    {chat.unread > 0 && <span className="chat-item-badge">{chat.unread}</span>}
                  </div>
                  <div className="chat-item-meta">
                    {chat.isHot && (
                      <span className="chat-item-hot">
                        <HiOutlineFire size={12} /> Hot
                      </span>
                    )}
                    <span className={`chat-item-status ${chat.status}`}>
                      {chat.status === 'bot' ? <HiOutlineChip size={12} /> : <HiOutlineUser size={12} />}
                      {chat.status === 'bot' ? 'Bot' : 'Human'}
                    </span>
                    <button
                      type="button"
                      className="unread-inline-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleMarkRead(chat.id)
                      }}
                      disabled={markingAllRead || markingChatId === chat.id}
                    >
                      {markingChatId === chat.id ? 'Marking...' : 'Mark read'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
