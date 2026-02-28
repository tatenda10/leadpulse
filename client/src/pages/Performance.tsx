import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HiOutlineClock, HiOutlineChip, HiOutlineUser, HiOutlineTrendingUp } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Performance.css'

type PerformanceResponse = {
  cards: {
    avgBotResponseSeconds: number
    botResolutionRate: number
    humanTakeoverRate: number
    leadConversionRate: number
  }
  responseTimeTrend: Array<{ day: string; bot: number; human: number }>
  resolutionByHour: Array<{ hour: string; bot: number; human: number }>
  weeklyPerformance: Array<{ week: string; resolved: number; escalated: number }>
}

export const Performance: React.FC = () => {
  const { token } = useAuth()
  const [data, setData] = useState<PerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<PerformanceResponse>('/analytics/performance', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load performance data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const perfCards = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Avg Bot Response', value: `${data.cards.avgBotResponseSeconds.toFixed(2)}s`, change: 'Live', trend: 'down' as const, icon: HiOutlineClock, iconColor: '#3b82f6' },
      { label: 'Bot Resolution Rate', value: `${data.cards.botResolutionRate.toFixed(1)}%`, change: 'Live', trend: 'up' as const, icon: HiOutlineChip, iconColor: '#6366f1' },
      { label: 'Human Takeover Rate', value: `${data.cards.humanTakeoverRate.toFixed(1)}%`, change: 'Live', trend: 'up' as const, icon: HiOutlineUser, iconColor: '#22c55e' },
      { label: 'Lead Conversion', value: `${data.cards.leadConversionRate.toFixed(2)}%`, change: 'Live', trend: 'up' as const, icon: HiOutlineTrendingUp, iconColor: '#8b5cf6' },
    ]
  }, [data])

  if (loading)
    return (
      <div className="performance-page">
        <div className="performance-header">
          <div className="skeleton performance-title-skeleton" />
          <div className="skeleton performance-desc-skeleton" />
        </div>
        <div className="performance-cards">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="perf-card perf-card-skeleton">
              <div className="skeleton perf-card-icon-skeleton" />
              <div className="skeleton perf-card-label-skeleton" />
              <div className="skeleton perf-card-value-skeleton" />
            </div>
          ))}
        </div>
        <div className="performance-charts">
          <div className="chart-card chart-wide chart-skeleton skeleton" />
          <div className="chart-card chart-skeleton skeleton" />
        </div>
        <div className="performance-charts">
          <div className="chart-card chart-full chart-skeleton skeleton" />
        </div>
      </div>
    )
  if (error) return <div className="performance-page"><div className="chart-card">{error}</div></div>
  if (!data) return <div className="performance-page"><div className="chart-card">No data available</div></div>

  return (
    <div className="performance-page">
      <div className="performance-header">
        <h1 className="performance-title">Performance</h1>
        <p className="performance-desc">See how your bot and team are performing over time.</p>
      </div>
      <div className="performance-cards">
        {perfCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="perf-card">
              <div className="perf-card-icon" style={{ color: card.iconColor }}>
                <Icon size={22} />
              </div>
              <div className="perf-card-label">{card.label}</div>
              <div className="perf-card-value">{card.value}</div>
              <div className={`perf-card-change ${card.trend}`}>{card.change}</div>
            </div>
          )
        })}
      </div>
      <div className="performance-charts">
        <div className="chart-card chart-wide">
          <div className="chart-title">Response Time (Bot vs Human)</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.responseTimeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Line type="monotone" dataKey="bot" name="Bot (sec)" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
              <Line type="monotone" dataKey="human" name="Human (min)" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Resolutions by Hour (Today)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.resolutionByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="bot" name="Bot" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="human" name="Human" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="performance-charts">
        <div className="chart-card chart-full">
          <div className="chart-title">Weekly Resolved vs Escalated</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.weeklyPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="resolved" name="Resolved" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="escalated" name="Escalated to Human" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

