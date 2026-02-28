import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiOutlineUser } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

type Response = {
  kpis: {
    takeoversToday: { value: number; change: string }
    avgResponseMinutes: { value: number; change: string }
    resolvedByAgents: { value: number; change: string }
    satisfaction: { value: number; change: string }
  }
  agentByName: Array<{ name: string; takeovers: number; resolved: number }>
  takeoverByHour: Array<{ hour: string; count: number }>
}

export const AgentPerformance: React.FC = () => {
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
        const response = await apiRequest<Response>('/analytics/agent-performance', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agent performance')
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
      { label: 'Takeovers today', value: String(data.kpis.takeoversToday.value), change: data.kpis.takeoversToday.change, icon: HiOutlineUser, color: '#22c55e' },
      { label: 'Avg response', value: `${data.kpis.avgResponseMinutes.value.toFixed(2)}m`, change: data.kpis.avgResponseMinutes.change, icon: HiOutlineUser, color: '#3b82f6' },
      { label: 'Resolved by agents', value: String(data.kpis.resolvedByAgents.value), change: data.kpis.resolvedByAgents.change, icon: HiOutlineUser, color: '#7c3aed' },
      { label: 'Satisfaction', value: `${data.kpis.satisfaction.value.toFixed(0)}%`, change: data.kpis.satisfaction.change, icon: HiOutlineUser, color: '#f59e0b' },
    ]
  }, [data])

  if (loading)
    return (
      <div className="analytics-page">
        <header className="analytics-header">
          <div className="skeleton analytics-title-skeleton" />
          <div className="skeleton analytics-desc-skeleton" />
        </header>
        <div className="analytics-kpis">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="analytics-kpi-card analytics-kpi-card-skeleton">
              <div className="skeleton analytics-kpi-icon-skeleton" />
              <div className="skeleton analytics-kpi-label-skeleton" />
              <div className="skeleton analytics-kpi-value-skeleton" />
              <div className="skeleton analytics-kpi-change-skeleton" />
            </div>
          ))}
        </div>
        <div className="analytics-charts">
          <div className="analytics-chart-card chart-wide analytics-chart-card-skeleton">
            <div className="skeleton analytics-chart-title-skeleton" />
            <div className="skeleton analytics-chart-area-skeleton" />
          </div>
          <div className="analytics-chart-card chart-wide analytics-chart-card-skeleton">
            <div className="skeleton analytics-chart-title-skeleton" />
            <div className="skeleton analytics-chart-area-skeleton" />
          </div>
        </div>
      </div>
    )
  if (error || !data) return <div className="analytics-page"><div className="analytics-chart-card">{error || 'No data'}</div></div>

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Agent Performance</h1>
        <p className="analytics-desc">Monitor human agent takeovers and resolution.</p>
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
          <div className="analytics-chart-title">Agent takeovers & resolutions</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.agentByName}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="takeovers" fill="#7c3aed" name="Takeovers" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill="#22c55e" name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card chart-wide">
          <div className="analytics-chart-title">Takeovers by hour (today)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.takeoverByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" fill="#22c55e" name="Takeovers" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

