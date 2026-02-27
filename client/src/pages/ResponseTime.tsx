import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiOutlineClock } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

type Response = {
  kpis: {
    avgBotResponseSeconds: { value: number; change: string }
    avgHumanResponseMinutes: { value: number; change: string }
    lt1MinPct: { value: number; change: string }
    gt5MinPct: { value: number; change: string }
  }
  botVsHuman: Array<{ day: string; bot: number; human: number }>
  responseDist: Array<{ range: string; count: number; fill: string }>
}

export const ResponseTime: React.FC = () => {
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
        const response = await apiRequest<Response>('/analytics/response-time', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load response time analytics')
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
      { label: 'Avg bot response', value: `${data.kpis.avgBotResponseSeconds.value.toFixed(2)}s`, change: data.kpis.avgBotResponseSeconds.change, icon: HiOutlineClock, color: '#6366f1' },
      { label: 'Avg human response', value: `${data.kpis.avgHumanResponseMinutes.value.toFixed(2)}m`, change: data.kpis.avgHumanResponseMinutes.change, icon: HiOutlineClock, color: '#22c55e' },
      { label: '< 1 min', value: `${data.kpis.lt1MinPct.value.toFixed(2)}%`, change: data.kpis.lt1MinPct.change, icon: HiOutlineClock, color: '#22c55e' },
      { label: '> 5 min', value: `${data.kpis.gt5MinPct.value.toFixed(2)}%`, change: data.kpis.gt5MinPct.change, icon: HiOutlineClock, color: '#ef4444' },
    ]
  }, [data])

  if (loading) return <div className="analytics-page"><div className="analytics-chart-card">Loading...</div></div>
  if (error || !data) return <div className="analytics-page"><div className="analytics-chart-card">{error || 'No data'}</div></div>

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Response Time</h1>
        <p className="analytics-desc">Track bot and agent response times.</p>
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
          <div className="analytics-chart-title">Bot vs Human response time</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.botVsHuman}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Line type="monotone" dataKey="bot" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Bot (sec)" />
              <Line type="monotone" dataKey="human" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Human (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Response time distribution (%)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.responseDist} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="range" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" name="%" radius={[0, 4, 4, 0]}>
                {data.responseDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

