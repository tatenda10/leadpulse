import React, { useState } from 'react'
import { HiOutlineChip, HiOutlineFire, HiOutlineUser } from 'react-icons/hi'
import './BotHandling.css'

type Chat = {
  id: string
  contact: string
  phone: string
  lastMessage: string
  lastBotReply: string
  time: string
  unread: number
  isHot: boolean
}

const MOCK_BOT_CHATS: Chat[] = [
  { id: '2', contact: 'Sarah Ncube', phone: '+263 71 987 6543', lastMessage: 'Thanks for the info', lastBotReply: 'You\'re welcome! Anything else?', time: '5m', unread: 0, isHot: false },
  { id: '3', contact: '+263 78 555 1234', phone: '+263 78 555 1234', lastMessage: 'I want to buy today', lastBotReply: 'Great! Let me share our pricing...', time: '8m', unread: 1, isHot: true },
  { id: '5', contact: 'Grace Mutasa', phone: '+263 71 333 4444', lastMessage: 'Send me the catalogue', lastBotReply: 'Here are our product options:', time: '18m', unread: 3, isHot: true },
  { id: '6', contact: 'David Sibanda', phone: '+263 77 999 8888', lastMessage: 'Do you have stock?', lastBotReply: 'Yes! We have stock available.', time: '22m', unread: 0, isHot: false },
  { id: '7', contact: 'Linda Moyo', phone: '+263 71 777 6666', lastMessage: 'Hi there', lastBotReply: 'Hello! How can we help?', time: '35m', unread: 0, isHot: false },
]

const MOCK_MESSAGES = [
  { id: 1, sender: 'customer', text: 'Send me the catalogue', time: '10:15' },
  { id: 2, sender: 'bot', text: 'Here are our product options: [Link to catalogue]', time: '10:15' },
  { id: 3, sender: 'customer', text: 'What about pricing?', time: '10:16' },
  { id: 4, sender: 'bot', text: 'Our prices start from $50. Would you like a detailed quote?', time: '10:16' },
]

export const BotHandling: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(MOCK_BOT_CHATS[0])
  const [messageInput, setMessageInput] = useState('')

  return (
    <div className="bot-handling">
      <div className="bot-handling-header">
        <div className="bot-handling-title-wrap">
          <HiOutlineChip size={24} className="bot-handling-icon" />
          <div>
            <h2 className="bot-handling-title">Bot Handling</h2>
            <p className="bot-handling-subtitle">{MOCK_BOT_CHATS.length} conversations with bot</p>
          </div>
        </div>
      </div>
      <div className="bot-handling-grid">
        <aside className="bot-chat-list">
          <div className="bot-chat-list-header">
            <span className="bot-chat-list-title">Bot conversations</span>
            <span className="bot-chat-list-count">{MOCK_BOT_CHATS.length}</span>
          </div>
          <div className="bot-chat-list-items">
            {MOCK_BOT_CHATS.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`bot-chat-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chat.unread ? 'unread' : ''}`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="bot-chat-item-avatar">{chat.contact.charAt(0)}</div>
                <div className="bot-chat-item-content">
                  <div className="bot-chat-item-top">
                    <span className="bot-chat-item-contact">{chat.contact}</span>
                    <span className="bot-chat-item-time">{chat.time}</span>
                  </div>
                  <div className="bot-chat-item-bottom">
                    <span className="bot-chat-item-preview">{chat.lastMessage}</span>
                    {chat.unread > 0 && <span className="bot-chat-item-badge">{chat.unread}</span>}
                  </div>
                  <div className="bot-chat-item-meta">
                    {chat.isHot && (
                      <span className="bot-chat-item-hot">
                        <HiOutlineFire size={12} /> Hot
                      </span>
                    )}
                    <span className="bot-chat-item-bot-badge">
                      <HiOutlineChip size={12} /> Bot
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <section className="bot-chat-window">
          {selectedChat ? (
            <>
              <div className="bot-chat-window-header">
                <div className="bot-chat-window-contact">
                  <div className="bot-chat-window-avatar">{selectedChat.contact.charAt(0)}</div>
                  <div>
                    <div className="bot-chat-window-name">{selectedChat.contact}</div>
                    <div className="bot-chat-window-phone">{selectedChat.phone}</div>
                  </div>
                </div>
                <button type="button" className="bot-takeover-btn">
                  <HiOutlineUser size={16} />
                  Take over
                </button>
              </div>
              <div className="bot-chat-messages">
                {MOCK_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`bot-chat-message ${msg.sender}`}>
                    <div className="bot-chat-bubble">
                      <span className="bot-chat-bubble-text">{msg.text}</span>
                      <span className="bot-chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bot-chat-input-wrap">
                <input
                  type="text"
                  className="bot-chat-input"
                  placeholder="Type a message to take over..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button type="button" className="bot-chat-send-btn">Take over & reply</button>
              </div>
            </>
          ) : (
            <div className="bot-chat-window-empty">
              <HiOutlineChip size={48} className="empty-icon" />
              <p>Select a bot conversation</p>
              <span className="bot-empty-hint">Click &quot;Take over&quot; to handle manually</span>
            </div>
          )}
        </section>
        <aside className="bot-lead-panel">
          {selectedChat ? (
            <>
              <div className="bot-lead-panel-header">Bot conversation</div>
              <div className="bot-lead-panel-section">
                <div className="bot-lead-info-row">
                  <span className="bot-lead-label">Last bot reply</span>
                  <span className="bot-lead-value">{selectedChat.lastBotReply}</span>
                </div>
                <div className="bot-lead-info-row">
                  <span className="bot-lead-label">Status</span>
                  <span className="bot-lead-value bot-badge">Bot handling</span>
                </div>
                <div className="bot-lead-info-row">
                  <span className="bot-lead-label">Hot lead</span>
                  <span className="bot-lead-value">{selectedChat.isHot ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bot-lead-panel-empty">Select a chat</div>
          )}
        </aside>
      </div>
    </div>
  )
}
