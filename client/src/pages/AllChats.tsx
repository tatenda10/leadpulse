import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineChip, HiOutlineUser, HiOutlineChat } from 'react-icons/hi'
import './AllChats.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

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

export const AllChats: React.FC = () => {
  const { token } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')

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
          unread: chat.unread,
          status: chat.status,
          isHot: chat.isHot,
          leadScore: Number(chat.leadScore || 0),
          source: chat.source,
        }))

        setChats(nextChats)
        setSelectedChatId((current) => {
          if (current && nextChats.some((chat) => chat.id === current)) {
            return current
          }
          return nextChats[0]?.id ?? null
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
  }, [token])

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

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  )

  const buyLikelihoodScore = useMemo(() => calculateBuyLikelihood(messages), [messages])
  const buyLikelihoodLabel = useMemo(() => getLikelihoodLabel(buyLikelihoodScore), [buyLikelihoodScore])

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
    <div className="all-chats">
      <aside className="chat-list">
        <div className="chat-list-header">
          <span className="chat-list-title">Conversations</span>
          <span className="chat-list-count">{chats.length}</span>
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
          ) : chats.length === 0 ? (
            <div className="chat-window-empty">
              <p>No conversations yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chat.unread ? 'unread' : ''}`}
                onClick={() => setSelectedChatId(chat.id)}
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
                <div className="chat-window-avatar">{selectedChat.contact.charAt(0) || '?'}</div>
                <div>
                  <div className="chat-window-name">{selectedChat.contact}</div>
                  <div className="chat-window-phone">{selectedChat.phone}</div>
                </div>
              </div>
              <button type="button" className="takeover-btn" onClick={handleToggleTakeover} disabled={updatingStatus}>
                {updatingStatus
                  ? 'Updating...'
                  : selectedChat.status === 'bot'
                    ? 'Take over'
                    : 'Return to bot'}
              </button>
            </div>

            <div className="chat-messages">
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
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`chat-message ${msg.sender}`}>
                    <div className="chat-bubble">
                      <span className="chat-bubble-text">{msg.text}</span>
                      <span className="chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))
              )}
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

      <aside className="chat-lead-panel">
        {selectedChat ? (
          <>
            <div className="lead-panel-header">Lead info</div>
            <div className="lead-panel-section">
              <div className="lead-score-row">
                <span className="lead-label">Buy likelihood</span>
                <span className={`lead-score ${buyLikelihoodScore >= 75 ? 'hot' : ''}`}>{buyLikelihoodScore}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Likelihood</span>
                <span className="lead-value">{buyLikelihoodLabel}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Model score</span>
                <span className="lead-value">{selectedChat.leadScore}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Lead tier</span>
                <span className="lead-value">{getLeadTier(selectedChat.leadScore, warmThreshold, hotThreshold).toUpperCase()}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Status</span>
                <span className="lead-value">{selectedChat.status === 'bot' ? 'Bot handling' : 'Human handling'}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Source</span>
                <span className="lead-value">{selectedChat.source || '--'}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Last activity</span>
                <span className="lead-value">{formatStartedAt(selectedChat.lastMessageAt)}</span>
              </div>
            </div>
            <div className="lead-panel-section">
              <div className="lead-label">Notes</div>
              <textarea className="lead-notes" placeholder="Add notes..." rows={3} />
            </div>
          </>
        ) : (
          <div className="lead-panel-empty">
            <HiOutlineUser size={32} className="lead-panel-empty-icon" />
            <span>Select a chat to view lead details</span>
          </div>
        )}
      </aside>
    </div>
  )
}
