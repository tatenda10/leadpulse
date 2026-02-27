import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiOutlineChip } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

type Response = {
  kpis: {
    botResolutionRate: { value: number; change: string }
    avgResponseSeconds: { value: number; change: string }
    handledToday: { value: number; change: string }
    fallbackRate: { value: number; change: string }
  }
  botByDay: Array<{ day: string; resolved: number; escalated: number }>
  responseTime: Array<{ day: string; bot: number }>
}

export const BotPerformance: React.FC = () => {
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
        const response = await apiRequest<Response>('/analytics/bot-performance', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load bot performance')
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
      { label: 'Bot resolution rate', value: `${data.kpis.botResolutionRate.value.toFixed(1)}%`, change: data.kpis.botResolutionRate.change, icon: HiOutlineChip, color: '#6366f1' },
      { label: 'Avg response time', value: `${data.kpis.avgResponseSeconds.value.toFixed(2)}s`, change: data.kpis.avgResponseSeconds.change, icon: HiOutlineChip, color: '#22c55e' },
      { label: 'Handled today', value: data.kpis.handledToday.value.toLocaleString(), change: data.kpis.handledToday.change, icon: HiOutlineChip, color: '#7c3aed' },
      { label: 'Fallback rate', value: `${data.kpis.fallbackRate.value.toFixed(2)}%`, change: data.kpis.fallbackRate.change, icon: HiOutlineChip, color: '#f59e0b' },
    ]
  }, [data])

  if (loading) return <div className="analytics-page"><div className="analytics-chart-card">Loading...</div></div>
  if (error || !data) return <div className="analytics-page"><div className="analytics-chart-card">{error || 'No data'}</div></div>

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Bot Performance</h1>
        <p className="analytics-desc">Track chatbot resolution, response time, and escalation.</p>
      </header>
      <div className="analytics-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="analytics-kpi-card">
              <div className="analytics-kpi-icon" style={{ color: kpi.color }}><Icon size={22} /></div>
              <div className="analytics-kpi-label">{kpi.label}</div>
              <div className="analytics-kpi-value">{kpi.value}</div>
              <div className="analytics-kpi-change">{kpi.change} vs last week</div>
            </div>
          )
        })}
      </div>
      <div className="analytics-charts">
        <div className="analytics-chart-card chart-wide">
          <div className="analytics-chart-title">Resolved vs Escalated (daily)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.botByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="resolved" fill="#22c55e" name="Resolved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="escalated" fill="#f59e0b" name="Escalated" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Avg bot response time (sec)</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.responseTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="bot" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Seconds" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

