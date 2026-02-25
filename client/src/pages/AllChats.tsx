import React, { useState } from 'react'
import { HiOutlineFire, HiOutlineChip, HiOutlineUser, HiOutlineChat } from 'react-icons/hi'
import './AllChats.css'

type Chat = {
  id: string
  contact: string
  phone: string
  lastMessage: string
  time: string
  unread: number
  status: 'bot' | 'human'
  isHot: boolean
}

const MOCK_CHATS: Chat[] = [
  { id: '1', contact: 'John Mbanga', phone: '+263 77 123 4567', lastMessage: 'What is your best price?', time: '2m', unread: 2, status: 'human', isHot: true },
  { id: '2', contact: 'Sarah Ncube', phone: '+263 71 987 6543', lastMessage: 'Thanks for the info', time: '5m', unread: 0, status: 'bot', isHot: false },
  { id: '3', contact: '+263 78 555 1234', phone: '+263 78 555 1234', lastMessage: 'I want to buy today', time: '8m', unread: 1, status: 'bot', isHot: true },
  { id: '4', contact: 'Mike Dube', phone: '+263 77 111 2222', lastMessage: 'Can I get a callback?', time: '12m', unread: 0, status: 'human', isHot: false },
  { id: '5', contact: 'Grace Mutasa', phone: '+263 71 333 4444', lastMessage: 'Send me the catalogue', time: '18m', unread: 3, status: 'bot', isHot: true },
]

const MOCK_MESSAGES = [
  { id: 1, sender: 'customer', text: 'Hi, I saw your ad on Facebook', time: '10:32' },
  { id: 2, sender: 'bot', text: 'Hello! Thanks for reaching out. How can we help you today?', time: '10:32' },
  { id: 3, sender: 'customer', text: 'What is your best price?', time: '10:34' },
  { id: 4, sender: 'agent', text: 'Hi John, I\'d be happy to help. Let me share our current offers...', time: '10:35' },
]

export const AllChats: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(MOCK_CHATS[0])
  const [messageInput, setMessageInput] = useState('')

  return (
    <div className="all-chats">
      <aside className="chat-list">
        <div className="chat-list-header">
          <span className="chat-list-title">Conversations</span>
          <span className="chat-list-count">{MOCK_CHATS.length}</span>
        </div>
        <div className="chat-list-items">
          {MOCK_CHATS.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chat.unread ? 'unread' : ''}`}
              onClick={() => setSelectedChat(chat)}
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
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section className="chat-window">
        {selectedChat ? (
          <>
            <div className="chat-window-header">
              <div className="chat-window-contact">
                <div className="chat-window-avatar">{selectedChat.contact.charAt(0)}</div>
                <div>
                  <div className="chat-window-name">{selectedChat.contact}</div>
                  <div className="chat-window-phone">{selectedChat.phone}</div>
                </div>
              </div>
              <button type="button" className="takeover-btn">
                {selectedChat.status === 'bot' ? 'Take over' : 'Return to bot'}
              </button>
            </div>
            <div className="chat-messages">
              {MOCK_MESSAGES.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.sender}`}>
                  <div className="chat-bubble">
                    <span className="chat-bubble-text">{msg.text}</span>
                    <span className="chat-bubble-time">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input-wrap">
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button type="button" className="chat-send-btn">Send</button>
            </div>
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
                <span className="lead-label">Score</span>
                <span className={`lead-score ${selectedChat.isHot ? 'hot' : ''}`}>
                  {selectedChat.isHot ? '92' : '45'}
                </span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Status</span>
                <span className="lead-value">{selectedChat.status === 'bot' ? 'Bot handling' : 'Human handling'}</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Source</span>
                <span className="lead-value">Facebook Ads</span>
              </div>
              <div className="lead-info-row">
                <span className="lead-label">Started</span>
                <span className="lead-value">Today, 10:30</span>
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
