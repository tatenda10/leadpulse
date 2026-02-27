import React, { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiOutlineChat, HiOutlineTrendingUp } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

type Response = {
  kpis: {
    totalConversations: { value: number; change: string }
    newThisWeek: { value: number; change: string }
    resolved: { value: number; change: string }
    escalated: { value: number; change: string }
  }
  dailyConversations: Array<{ day: string; new: number; resolved: number }>
  weeklyTrend: Array<{ week: string; conversations: number }>
}

export const ConversationTrends: React.FC = () => {
  const { token } = useAuth()
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<Response>('/analytics/conversation-trends', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load conversation trends')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [token])

  const kpis = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Total conversations', value: data.kpis.totalConversations.value.toLocaleString(), change: data.kpis.totalConversations.change, icon: HiOutlineChat, color: '#7c3aed' },
      { label: 'New this week', value: data.kpis.newThisWeek.value.toLocaleString(), change: data.kpis.newThisWeek.change, icon: HiOutlineTrendingUp, color: '#22c55e' },
      { label: 'Resolved', value: data.kpis.resolved.value.toLocaleString(), change: data.kpis.resolved.change, icon: HiOutlineChat, color: '#3b82f6' },
      { label: 'Escalated', value: data.kpis.escalated.value.toLocaleString(), change: data.kpis.escalated.change, icon: HiOutlineTrendingUp, color: '#f59e0b' },
    ]
  }, [data])

  if (loading) return <div className="analytics-page"><div className="analytics-chart-card">Loading...</div></div>
  if (error || !data) return <div className="analytics-page"><div className="analytics-chart-card">{error || 'No data'}</div></div>

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Conversation Trends</h1>
        <p className="analytics-desc">Track conversation volume and resolution over time.</p>
      </header>
      <div className="analytics-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="analytics-kpi-card">
              <div className="analytics-kpi-icon" style={{ color: kpi.color }}><Icon size={22} /></div>
              <div className="analytics-kpi-label">{kpi.label}</div>
              <div className="analytics-kpi-value">{kpi.value}</div>
              <div className="analytics-kpi-change">{kpi.change} vs last period</div>
            </div>
          )
        })}
      </div>
      <div className="analytics-charts">
        <div className="analytics-chart-card chart-wide">
          <div className="analytics-chart-title">Daily conversations (New vs Resolved)</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyConversations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Area type="monotone" dataKey="new" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} name="New" />
              <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Weekly trend</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="conversations" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed' }} name="Conversations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

