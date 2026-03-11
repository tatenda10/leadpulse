import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineChip, HiOutlineUser, HiOutlineChat, HiOutlineArrowLeft, HiOutlineX, HiOutlineSearch } from 'react-icons/hi'
import './AllChats.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import { useUnreadCount } from '../contexts/UnreadCountContext'
import { getEffectiveUnreadCount, markConversationReadLocally } from '../utils/conversationReadState'

type Chat = {
  id: string
  contact: string
  phone: string
  lastMessage: string
  lastMessageAt: string | null
  unread: number
  status: 'bot' | 'human'
  isHot: boolean
  leadScore: number
  source: string | null
}

type ChatMessage = {
  id: string
  sender: 'customer' | 'bot' | 'agent'
  text: string
  time: string
  createdAt: string
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
    leadScore: number
    source: string | null
  }>
}

type MessagesResponse = {
  messages: Array<{
    id: number
    sender: 'customer' | 'bot' | 'agent'
    body: string
    createdAt: string
  }>
}

type UpdateConversationResponse = {
  conversation: {
    id: number | string
    status: 'bot' | 'human'
    segment: string | null
    lead_score: number | null
  }
}

type SendMessageResponse = {
  message: {
    id: number
    sender: 'agent'
    body: string
    createdAt: string
  }
}

type ThresholdResponse = {
  warmThreshold: number
  hotThreshold: number
}

const BUY_INTENT_KEYWORDS = [
  'buy',
  'price',
  'cost',
  'quote',
  'ready',
  'order',
  'catalogue',
  'payment',
  'invoice',
  'when can',
  'today',
  'sign up',
]

const LOW_INTENT_KEYWORDS = ['maybe', 'not sure', 'later', 'expensive', 'too much', 'no thanks', 'just checking']

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function calculateBuyLikelihood(messages: ChatMessage[]): number {
  if (messages.length === 0) return 0

  const customerMessages = messages.filter((m) => m.sender === 'customer')
  const customerText = customerMessages.map((m) => m.text.toLowerCase()).join(' ')

  let score = 20

  if (messages.length >= 4) score += 10
  if (messages.length >= 8) score += 10

  score += Math.min(customerMessages.length * 4, 20)

  const intentMatches = BUY_INTENT_KEYWORDS.reduce((acc, keyword) => {
    return acc + (customerText.includes(keyword) ? 1 : 0)
  }, 0)
  score += Math.min(intentMatches * 8, 32)

  const lowIntentMatches = LOW_INTENT_KEYWORDS.reduce((acc, keyword) => {
    return acc + (customerText.includes(keyword) ? 1 : 0)
  }, 0)
  score -= Math.min(lowIntentMatches * 12, 36)

  const hasQuestion = customerMessages.some((m) => m.text.includes('?'))
  if (hasQuestion) score += 6

  const lastCustomerMessage = [...customerMessages].reverse()[0]
  if (lastCustomerMessage) {
    const lastText = lastCustomerMessage.text.toLowerCase()
    if (BUY_INTENT_KEYWORDS.some((keyword) => lastText.includes(keyword))) {
      score += 10
    }
  }

  return clampScore(score)
}

function getLikelihoodLabel(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 75) return 'High'
  if (score >= 50) return 'Medium'
  return 'Low'
}

function getLeadTier(score: number, warmThreshold: number, hotThreshold: number): 'cold' | 'warm' | 'hot' {
  if (score >= hotThreshold) return 'hot'
  if (score >= warmThreshold) return 'warm'
  return 'cold'
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

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatStartedAt(value: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ChatFilter = 'all' | 'hot' | 'warm' | 'cold' | 'bot' | 'human'

type AllChatsProps = {
  preferredChatId?: string | null
  onPreferredChatHandled?: () => void
}

export const AllChats: React.FC<AllChatsProps> = ({ preferredChatId = null, onPreferredChatHandled }) => {
  const { token } = useAuth()
  const { setUnreadCount } = useUnreadCount()
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchOpen, setChatSearchOpen] = useState(false)

  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sending, setSending] = useState(false)
  const [warmThreshold, setWarmThreshold] = useState(40)
  const [hotThreshold, setHotThreshold] = useState(70)

  useEffect(() => {
    setUnreadCount(chats.reduce((sum, chat) => sum + chat.unread, 0))
  }, [chats, setUnreadCount])

  useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      if (!token) {
        setChats([])
        setSelectedChatId(null)
        setLoadingChats(false)
        return
      }

      setLoadingChats(true)
      setChatError(null)

      try {
        const response = await apiRequest<ConversationsResponse>('/conversations', { token })
        if (cancelled) return

        const nextChats: Chat[] = response.conversations.map((chat) => ({
          id: chat.id,
          contact: chat.contact,
          phone: chat.phone,
          lastMessage: chat.lastMessage || 'No messages yet',
          lastMessageAt: chat.lastMessageAt,
          unread: getEffectiveUnreadCount(chat.id, chat.unread, chat.lastMessageAt),
          status: chat.status,
          isHot: chat.isHot,
          leadScore: Number(chat.leadScore || 0),
          source: chat.source,
        }))

        setChats(nextChats)
        setSelectedChatId((current) => {
          if (preferredChatId && nextChats.some((chat) => chat.id === preferredChatId)) {
            return preferredChatId
          }
          if (current && nextChats.some((chat) => chat.id === current)) {
            return current
          }
          return nextChats[nextChats.length - 1]?.id ?? null
        })
      } catch (error) {
        if (!cancelled) {
          setChatError(error instanceof Error ? error.message : 'Failed to load chats')
          setChats([])
          setSelectedChatId(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingChats(false)
        }
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [preferredChatId, token])

  useEffect(() => {
    if (!preferredChatId) return

    const chatExists = chats.some((chat) => chat.id === preferredChatId)
    if (!chatExists) return

    setSelectedChatId(preferredChatId)
    setIsMobileChatOpen(true)
    setChatSearchQuery('')
    setChatSearchOpen(false)
    onPreferredChatHandled?.()
  }, [chats, onPreferredChatHandled, preferredChatId])

  useEffect(() => {
    let cancelled = false

    async function loadThreshold() {
      if (!token) return
      try {
        const response = await apiRequest<ThresholdResponse>('/settings/hot-lead-threshold', { token })
        if (!cancelled) {
          setWarmThreshold(response.warmThreshold)
          setHotThreshold(response.hotThreshold)
        }
      } catch {
        if (!cancelled) {
          setWarmThreshold(40)
          setHotThreshold(70)
        }
      }
    }

    void loadThreshold()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function loadMessages(conversationId: string) {
      if (!token) {
        setMessages([])
        return
      }

      setLoadingMessages(true)
      setMessageError(null)
      setActionError(null)

      try {
        const response = await apiRequest<MessagesResponse>(`/conversations/${conversationId}/messages`, { token })
        if (cancelled) return

        const nextMessages: ChatMessage[] = response.messages.map((message) => ({
          id: String(message.id),
          sender: message.sender,
          text: message.body,
          createdAt: message.createdAt,
          time: formatMessageTime(message.createdAt),
        }))

        setMessages(nextMessages)
      } catch (error) {
        if (!cancelled) {
          setMessageError(error instanceof Error ? error.message : 'Failed to load messages')
          setMessages([])
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false)
        }
      }
    }

    if (!selectedChatId) {
      setMessages([])
      setMessageError(null)
      return
    }

    loadMessages(selectedChatId)

    return () => {
      cancelled = true
    }
  }, [selectedChatId, token])

  useEffect(() => {
    if (!selectedChatId) return

    const selectedChat = chats.find((chat) => chat.id === selectedChatId)
    markConversationReadLocally(selectedChatId, selectedChat?.lastMessageAt ?? null)

    if (token) {
      void apiRequest<UpdateConversationResponse>(`/conversations/${selectedChatId}`, {
        method: 'PATCH',
        body: { markRead: true },
        token,
      }).catch(() => {
        // Keep local unread clearing responsive even if persistence fails.
      })
    }

    setChats((prev) => {
      const target = prev.find((chat) => chat.id === selectedChatId)
      if (!target || target.unread === 0) return prev

      return prev.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              unread: 0,
            }
          : chat
      )
    })
  }, [chats, selectedChatId, token])

  useLayoutEffect(() => {
    if (!selectedChatId || loadingMessages) return

    const container = messagesContainerRef.current
    if (!container) return

    const previousScrollBehavior = container.style.scrollBehavior
    container.style.scrollBehavior = 'auto'
    container.scrollTop = container.scrollHeight
    container.style.scrollBehavior = previousScrollBehavior
  }, [selectedChatId, messages.length, loadingMessages])

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  )

  const filteredChats = useMemo(() => {
    let list = chats
    switch (chatFilter) {
      case 'hot':
        list = list.filter((c) => getLeadTier(c.leadScore, warmThreshold, hotThreshold) === 'hot')
        break
      case 'warm':
        list = list.filter((c) => getLeadTier(c.leadScore, warmThreshold, hotThreshold) === 'warm')
        break
      case 'cold':
        list = list.filter((c) => getLeadTier(c.leadScore, warmThreshold, hotThreshold) === 'cold')
        break
      case 'bot':
        list = list.filter((c) => c.status === 'bot')
        break
      case 'human':
        list = list.filter((c) => c.status === 'human')
        break
      default:
        break
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          c.contact.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      )
    }
    return list
  }, [chats, chatFilter, searchQuery, warmThreshold, hotThreshold])

  const buyLikelihoodScore = useMemo(() => calculateBuyLikelihood(messages), [messages])
  const buyLikelihoodLabel = useMemo(() => getLikelihoodLabel(buyLikelihoodScore), [buyLikelihoodScore])

  // When no chat is selected, ensure mobile view shows the chat list
  useEffect(() => {
    if (!selectedChatId) {
      setIsMobileChatOpen(false)
    }
  }, [selectedChatId])

  const handleToggleTakeover = async () => {
    if (!selectedChat || !token || updatingStatus) return

    setUpdatingStatus(true)
    setActionError(null)
    const nextStatus: 'bot' | 'human' = selectedChat.status === 'bot' ? 'human' : 'bot'

    try {
      const response = await apiRequest<UpdateConversationResponse>(`/conversations/${selectedChat.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
        token,
      })

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                status: response.conversation.status,
              }
            : chat
        )
      )
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update conversation status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSend = async () => {
    if (!selectedChat || !token || sending) return

    const text = messageInput.trim()
    if (!text) return

    if (selectedChat.status !== 'human') {
      setActionError('Take over this conversation first to send as human.')
      return
    }

    setSending(true)
    setActionError(null)

    try {
      const response = await apiRequest<SendMessageResponse>(`/conversations/${selectedChat.id}/messages`, {
        method: 'POST',
        body: { body: text },
        token,
      })

      const newMessage: ChatMessage = {
        id: String(response.message.id),
        sender: 'agent',
        text: response.message.body,
        createdAt: response.message.createdAt,
        time: formatMessageTime(response.message.createdAt),
      }

      setMessages((prev) => [...prev, newMessage])
      setMessageInput('')

      const nowIso = new Date().toISOString()
      markConversationReadLocally(selectedChat.id, nowIso)
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                lastMessage: text,
                lastMessageAt: nowIso,
              }
            : chat
        )
      )
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`all-chats ${isMobileChatOpen ? 'mobile-chat-open' : ''}`}>
      <aside className="chat-list">
        <div className="chat-list-header">
          <div className="chat-list-header-main">
            <span className="chat-list-title">Conversations</span>
            <span className="chat-list-count">{filteredChats.length}</span>
          </div>
          <div className="chat-search-wrap">
            <HiOutlineSearch size={18} className="chat-search-icon" />
            <input
              type="search"
              className="chat-search-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
          </div>
          <div className="chat-filter-pills">
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'all' ? 'active' : ''}`}
              onClick={() => setChatFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'hot' ? 'active' : ''}`}
              onClick={() => setChatFilter('hot')}
            >
              Hot leads
            </button>
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'warm' ? 'active' : ''}`}
              onClick={() => setChatFilter('warm')}
            >
              Warm
            </button>
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'cold' ? 'active' : ''}`}
              onClick={() => setChatFilter('cold')}
            >
              Cold
            </button>
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'bot' ? 'active' : ''}`}
              onClick={() => setChatFilter('bot')}
            >
              Bot
            </button>
            <button
              type="button"
              className={`chat-filter-pill ${chatFilter === 'human' ? 'active' : ''}`}
              onClick={() => setChatFilter('human')}
            >
              Human
            </button>
          </div>
        </div>
        <div className="chat-list-items">
          {loadingChats ? (
            <div className="chat-window-empty">
              <p>Loading conversations...</p>
            </div>
          ) : chatError ? (
            <div className="chat-window-empty">
              <p>{chatError}</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="chat-window-empty">
              <p>No conversations match this filter</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chat.unread ? 'unread' : ''}`}
                onClick={() => {
                  setSelectedChatId(chat.id)
                  setIsMobileChatOpen(true)
                  setChatSearchQuery('')
                  setChatSearchOpen(false)
                }}
              >
                <div className="chat-item-avatar">{chat.contact.charAt(0) || '?'}</div>
                <div className="chat-item-content">
                  <div className="chat-item-top">
                    <span className="chat-item-contact">{chat.contact}</span>
                    <span className="chat-item-time">{formatRelativeTime(chat.lastMessageAt)}</span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">{chat.lastMessage}</span>
                    {chat.unread > 0 && <span className="chat-item-badge">{chat.unread}</span>}
                  </div>
                  <div className="chat-item-meta">
                    <span className={`chat-item-tier ${getLeadTier(chat.leadScore, warmThreshold, hotThreshold)}`}>
                      {getLeadTier(chat.leadScore, warmThreshold, hotThreshold).toUpperCase()}
                    </span>
                    <span className={`chat-item-status ${chat.status}`}>
                      {chat.status === 'bot' ? <HiOutlineChip size={12} /> : <HiOutlineUser size={12} />}
                      {chat.status === 'bot' ? 'Bot' : 'Human'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="chat-window">
        {selectedChat ? (
          <>
            <div className="chat-window-header">
              <div className="chat-window-contact">
                <button
                  type="button"
                  className="chat-back-btn"
                  onClick={() => setIsMobileChatOpen(false)}
                >
                  <HiOutlineArrowLeft size={18} />
                </button>
                <div className="chat-window-avatar">{selectedChat.contact.charAt(0) || '?'}</div>
                <div>
                  <div className="chat-window-name">{selectedChat.contact}</div>
                  <div className="chat-window-phone">{selectedChat.phone}</div>
                </div>
              </div>
              <div className="chat-window-actions">
                <button
                  type="button"
                  className="chat-header-search-btn"
                  onClick={() => setChatSearchOpen((o) => !o)}
                  title="Search in chat"
                  aria-label="Search in chat"
                >
                  <HiOutlineSearch size={20} />
                </button>
                <button
                  type="button"
                  className="lead-info-btn"
                  onClick={() => setShowLeadModal(true)}
                >
                  Lead info
                </button>
                <button type="button" className="takeover-btn" onClick={handleToggleTakeover} disabled={updatingStatus}>
                  {updatingStatus
                    ? 'Updating...'
                    : selectedChat.status === 'bot'
                      ? 'Take over'
                      : 'Return to bot'}
                </button>
              </div>
            </div>

            {chatSearchOpen && (
              <div className="chat-search-in-chat">
                <HiOutlineSearch size={18} className="chat-search-in-chat-icon" />
                <input
                  type="search"
                  className="chat-search-in-chat-input"
                  placeholder="Search for a word or phrase..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                  aria-label="Search in conversation"
                />
                <button
                  type="button"
                  className="chat-search-in-chat-close"
                  onClick={() => { setChatSearchOpen(false); setChatSearchQuery('') }}
                  aria-label="Close search"
                >
                  <HiOutlineX size={18} />
                </button>
              </div>
            )}

            <div className="chat-messages" ref={messagesContainerRef}>
              {loadingMessages ? (
                <div className="chat-window-empty">
                  <p>Loading messages...</p>
                </div>
              ) : messageError ? (
                <div className="chat-window-empty">
                  <p>{messageError}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-window-empty">
                  <p>No messages in this conversation yet</p>
                </div>
              ) : (() => {
                const q = chatSearchQuery.trim().toLowerCase()
                const filtered = q
                  ? messages.filter((msg) => msg.text.toLowerCase().includes(q))
                  : messages
                if (filtered.length === 0 && q) {
                  return (
                    <div className="chat-window-empty">
                      <p>No messages match &quot;{chatSearchQuery}&quot;</p>
                    </div>
                  )
                }
                const highlight = (text: string) => {
                  if (!q) return text
                  const escaped = chatSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
                  return parts.map((part, i) =>
                    part.toLowerCase() === q ? <mark key={i} className="chat-search-highlight">{part}</mark> : part
                  )
                }
                return filtered.map((msg) => (
                  <div key={msg.id} className={`chat-message ${msg.sender}`}>
                    <div className="chat-bubble">
                      <span className="chat-bubble-text">{highlight(msg.text)}</span>
                      <span className="chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))
              })()}
            </div>

            <div className="chat-input-wrap">
              <input
                type="text"
                className="chat-input"
                placeholder={selectedChat.status === 'human' ? 'Type a message...' : 'Take over to reply manually'}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                disabled={selectedChat.status !== 'human' || sending}
              />
              <button type="button" className="chat-send-btn" onClick={handleSend} disabled={selectedChat.status !== 'human' || sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
            {actionError && (
              <div style={{ padding: '8px 16px', color: '#b91c1c', fontSize: 12, borderTop: '1px solid var(--border-color)' }}>
                {actionError}
              </div>
            )}
          </>
        ) : (
          <div className="chat-window-empty">
            <HiOutlineChat size={48} className="empty-icon" />
            <p>Select a conversation</p>
          </div>
        )}
      </section>

      {selectedChat && showLeadModal &&
        createPortal(
          <>
            <div
              className="segment-modal-overlay"
              onClick={() => setShowLeadModal(false)}
              aria-hidden="true"
            />
            <div
              className="segment-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lead-info-modal-title"
            >
              <div className="segment-modal-header">
                <h2 id="lead-info-modal-title" className="segment-modal-title">
                  Lead info
                </h2>
                <button
                  type="button"
                  className="segment-modal-close"
                  onClick={() => setShowLeadModal(false)}
                  aria-label="Close"
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
              <div className="segment-modal-body">
                <div className="segment-modal-field">
                  <label>Buy likelihood</label>
                  <div className="segment-detail-value">{buyLikelihoodScore}</div>
                </div>
                <div className="segment-modal-field">
                  <label>Likelihood</label>
                  <div className="segment-detail-value">{buyLikelihoodLabel}</div>
                </div>
                <div className="segment-modal-field">
                  <label>Model score</label>
                  <div className="segment-detail-value">{selectedChat.leadScore}</div>
                </div>
                <div className="segment-modal-field">
                  <label>Lead tier</label>
                  <div className="segment-detail-value">
                    {getLeadTier(selectedChat.leadScore, warmThreshold, hotThreshold).toUpperCase()}
                  </div>
                </div>
                <div className="segment-modal-field">
                  <label>Status</label>
                  <div className="segment-detail-value">
                    {selectedChat.status === 'bot' ? 'Bot handling' : 'Human handling'}
                  </div>
                </div>
                <div className="segment-modal-field">
                  <label>Source</label>
                  <div className="segment-detail-value">
                    {selectedChat.source || <span className="segment-detail-muted">--</span>}
                  </div>
                </div>
                <div className="segment-modal-field">
                  <label>Last activity</label>
                  <div className="segment-detail-value">
                    {formatStartedAt(selectedChat.lastMessageAt)}
                  </div>
                </div>
              </div>
              <div className="segment-modal-footer">
                <button
                  type="button"
                  className="segment-modal-btn segment-modal-btn-secondary"
                  onClick={() => setShowLeadModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

    </div>
  )
}
