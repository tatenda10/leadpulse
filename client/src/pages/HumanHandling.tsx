import React, { useState } from 'react'
import { HiOutlineUser, HiOutlineFire, HiOutlineChip } from 'react-icons/hi'
import './HumanHandling.css'

type Chat = {
  id: string
  contact: string
  phone: string
  lastMessage: string
  agentName: string
  time: string
  unread: number
  isHot: boolean
}

const MOCK_HUMAN_CHATS: Chat[] = [
  { id: '1', contact: 'John Mbanga', phone: '+263 77 123 4567', lastMessage: 'What is your best price?', agentName: 'You', time: '2m', unread: 2, isHot: true },
  { id: '4', contact: 'Mike Dube', phone: '+263 77 111 2222', lastMessage: 'Can I get a callback?', agentName: 'Sarah K', time: '12m', unread: 0, isHot: false },
  { id: '8', contact: 'Lisa Ndlovu', phone: '+263 71 444 5555', lastMessage: 'When can I get a quote?', agentName: 'You', time: '32m', unread: 0, isHot: true },
]

const MOCK_MESSAGES = [
  { id: 1, sender: 'customer', text: 'What is your best price?', time: '10:32' },
  { id: 2, sender: 'agent', text: 'Hi John, I\'d be happy to help. Let me share our current offers...', time: '10:35' },
  { id: 3, sender: 'customer', text: 'That sounds good. Can you send the full catalogue?', time: '10:36' },
  { id: 4, sender: 'agent', text: 'Sure! Here it is: [Link]. Let me know if you have questions.', time: '10:37' },
]

export const HumanHandling: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(MOCK_HUMAN_CHATS[0])
  const [messageInput, setMessageInput] = useState('')

  return (
    <div className="human-handling">
      <div className="human-handling-header">
        <div className="human-handling-title-wrap">
          <HiOutlineUser size={24} className="human-handling-icon" />
          <div>
            <h2 className="human-handling-title">Human Handling</h2>
            <p className="human-handling-subtitle">{MOCK_HUMAN_CHATS.length} conversations with agents</p>
          </div>
        </div>
      </div>
      <div className="human-handling-grid">
        <aside className="human-chat-list">
          <div className="human-chat-list-header">
            <span className="human-chat-list-title">Agent conversations</span>
            <span className="human-chat-list-count">{MOCK_HUMAN_CHATS.length}</span>
          </div>
          <div className="human-chat-list-items">
            {MOCK_HUMAN_CHATS.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`human-chat-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chat.unread ? 'unread' : ''}`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="human-chat-item-avatar">{chat.contact.charAt(0)}</div>
                <div className="human-chat-item-content">
                  <div className="human-chat-item-top">
                    <span className="human-chat-item-contact">{chat.contact}</span>
                    <span className="human-chat-item-time">{chat.time}</span>
                  </div>
                  <div className="human-chat-item-bottom">
                    <span className="human-chat-item-preview">{chat.lastMessage}</span>
                    {chat.unread > 0 && <span className="human-chat-item-badge">{chat.unread}</span>}
                  </div>
                  <div className="human-chat-item-meta">
                    {chat.isHot && (
                      <span className="human-chat-item-hot">
                        <HiOutlineFire size={12} /> Hot
                      </span>
                    )}
                    <span className="human-chat-item-agent-badge">
                      <HiOutlineUser size={12} /> {chat.agentName}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <section className="human-chat-window">
          {selectedChat ? (
            <>
              <div className="human-chat-window-header">
                <div className="human-chat-window-contact">
                  <div className="human-chat-window-avatar">{selectedChat.contact.charAt(0)}</div>
                  <div>
                    <div className="human-chat-window-name">{selectedChat.contact}</div>
                    <div className="human-chat-window-phone">{selectedChat.phone}</div>
                  </div>
                </div>
                <button type="button" className="human-return-btn">
                  <HiOutlineChip size={16} />
                  Return to bot
                </button>
              </div>
              <div className="human-chat-messages">
                {MOCK_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`human-chat-message ${msg.sender}`}>
                    <div className="human-chat-bubble">
                      <span className="human-chat-bubble-text">{msg.text}</span>
                      <span className="human-chat-bubble-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="human-chat-input-wrap">
                <input
                  type="text"
                  className="human-chat-input"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button type="button" className="human-chat-send-btn">Send</button>
              </div>
            </>
          ) : (
            <div className="human-chat-window-empty">
              <HiOutlineUser size={48} className="empty-icon" />
              <p>Select a conversation</p>
              <span className="human-empty-hint">Conversations handled by you or your team</span>
            </div>
          )}
        </section>
        <aside className="human-lead-panel">
          {selectedChat ? (
            <>
              <div className="human-lead-panel-header">Agent info</div>
              <div className="human-lead-panel-section">
                <div className="human-lead-info-row">
                  <span className="human-lead-label">Handled by</span>
                  <span className="human-lead-value">{selectedChat.agentName}</span>
                </div>
                <div className="human-lead-info-row">
                  <span className="human-lead-label">Status</span>
                  <span className="human-lead-value human-badge">Human handling</span>
                </div>
                <div className="human-lead-info-row">
                  <span className="human-lead-label">Hot lead</span>
                  <span className="human-lead-value">{selectedChat.isHot ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="human-lead-panel-empty">Select a chat</div>
          )}
        </aside>
      </div>
    </div>
  )
}
