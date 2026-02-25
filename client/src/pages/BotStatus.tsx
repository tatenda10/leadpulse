import React, { useState } from 'react'
import { HiOutlineStatusOnline, HiOutlineChip, HiOutlineChat, HiOutlineClock } from 'react-icons/hi'
import './BotStatus.css'

export const BotStatus: React.FC = () => {
  const [botEnabled, setBotEnabled] = useState(true)
  const [awayMessage, setAwayMessage] = useState(
    "Our team is currently away. We'll respond as soon as possible. For urgent matters, please leave your contact details."
  )
  const [showAwayMessage, setShowAwayMessage] = useState(false)

  const MOCK_STATS = [
    { label: 'Bot active', value: '2,847', sub: 'conversations today', icon: HiOutlineChat, color: '#7c3aed' },
    { label: 'Avg response', value: '1.2s', sub: 'per message', icon: HiOutlineClock, color: '#22c55e' },
  ]

  return (
    <div className="bot-status-page">
      <header className="bot-status-header">
        <div>
          <h1 className="bot-status-title">
            <HiOutlineStatusOnline size={24} />
            Bot Status
          </h1>
          <p className="bot-status-desc">
            Control your chatbot and view its performance.
          </p>
        </div>
      </header>

      <div className="bot-status-content">
        <div className="bot-status-card">
          <div className="bot-status-main">
            <div className="bot-status-indicator">
              <HiOutlineChip size={32} className={botEnabled ? 'online' : 'offline'} />
              <div>
                <h2 className="bot-status-label">Chatbot</h2>
                <span className={`bot-status-badge ${botEnabled ? 'online' : 'offline'}`}>
                  {botEnabled ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <label className="bot-status-toggle">
              <input
                type="checkbox"
                checked={botEnabled}
                onChange={(e) => setBotEnabled(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <p className="bot-status-hint">
            {botEnabled
              ? 'The bot is actively replying to incoming messages.'
              : 'The bot is paused. All new messages will wait for human agents.'}
          </p>
        </div>

        <div className="bot-status-card away-card">
          <div className="away-card-header">
            <h3 className="away-card-title">Away message</h3>
            <label className="away-toggle">
              <input
                type="checkbox"
                checked={showAwayMessage}
                onChange={(e) => setShowAwayMessage(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <p className="away-hint">Show this when no agents are available</p>
          <textarea
            value={awayMessage}
            onChange={(e) => setAwayMessage(e.target.value)}
            placeholder="Away message..."
            rows={3}
          />
        </div>

        <div className="bot-stats-row">
          {MOCK_STATS.map((stat) => (
            <div key={stat.label} className="bot-stat-card">
              <div className="bot-stat-icon" style={{ color: stat.color }}>
                <stat.icon size={20} />
              </div>
              <div className="bot-stat-content">
                <span className="bot-stat-value">{stat.value}</span>
                <span className="bot-stat-label">{stat.label}</span>
                <span className="bot-stat-sub">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
