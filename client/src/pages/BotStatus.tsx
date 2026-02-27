import React, { useEffect, useState } from 'react'
import { HiOutlineStatusOnline, HiOutlineChip, HiOutlineChat, HiOutlineClock } from 'react-icons/hi'
import './BotStatus.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type BotStatusResponse = {
  botEnabled: boolean
  awayEnabled: boolean
  awayMessage: string
  stats: {
    botActiveConversations: number
    botMessagesToday: number
    avgResponseSeconds: number
  }
}

function formatResponseSeconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '--'
  if (value < 60) return `${value}s`
  return `${(value / 60).toFixed(1)}m`
}

export const BotStatus: React.FC = () => {
  const { token } = useAuth()
  const [botEnabled, setBotEnabled] = useState(true)
  const [awayMessage, setAwayMessage] = useState('')
  const [showAwayMessage, setShowAwayMessage] = useState(false)
  const [saved, setSaved] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    botActiveConversations: 0,
    botMessagesToday: 0,
    avgResponseSeconds: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<BotStatusResponse>('/settings/bot-status', { token })
        if (cancelled) return
        setBotEnabled(response.botEnabled)
        setShowAwayMessage(response.awayEnabled)
        setAwayMessage(response.awayMessage)
        setStats(response.stats)
        setSaved(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load bot status')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadStatus()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSave = async () => {
    if (!token) return
    try {
      await apiRequest<BotStatusResponse>('/settings/bot-status', {
        method: 'PUT',
        body: {
          botEnabled,
          awayEnabled: showAwayMessage,
          awayMessage,
        },
        token,
      })
      setSaved(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save bot status')
    }
  }

  const statCards = [
    {
      label: 'Bot active',
      value: String(stats.botActiveConversations),
      sub: 'conversations in bot mode',
      icon: HiOutlineChat,
      color: '#7c3aed',
    },
    {
      label: 'Bot replies today',
      value: String(stats.botMessagesToday),
      sub: 'messages sent by bot today',
      icon: HiOutlineChip,
      color: '#22c55e',
    },
    {
      label: 'Avg response',
      value: formatResponseSeconds(stats.avgResponseSeconds),
      sub: 'average bot reply time today',
      icon: HiOutlineClock,
      color: '#f59e0b',
    },
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

      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      {loading ? (
        <div className="bot-status-card"><p>Loading bot status...</p></div>
      ) : (
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
                  onChange={(e) => {
                    setBotEnabled(e.target.checked)
                    setSaved(false)
                  }}
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
                  onChange={(e) => {
                    setShowAwayMessage(e.target.checked)
                    setSaved(false)
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <p className="away-hint">Show this when no agents are available</p>
            <textarea
              value={awayMessage}
              onChange={(e) => {
                setAwayMessage(e.target.value)
                setSaved(false)
              }}
              placeholder="Away message..."
              rows={3}
            />
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="bot-status-save-btn"
                onClick={() => void handleSave()}
                disabled={saved || !awayMessage.trim()}
              >
                {saved ? 'Saved' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="bot-stats-row">
            {statCards.map((stat) => (
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
      )}
    </div>
  )
}
