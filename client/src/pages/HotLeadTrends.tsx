import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiOutlineFire } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

type Response = {
  kpis: {
    hotToday: { value: number; change: string }
    hot7d: { value: number; change: string }
    conversionRate: { value: number; change: string }
    avgHotScore: { value: number; change: string }
  }
  hotByDay: Array<{ day: string; hot: number; warm: number; cold: number }>
  hotSources: Array<{ name: string; value: number; color: string }>
}

export const HotLeadTrends: React.FC = () => {
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
        const response = await apiRequest<Response>('/analytics/hot-lead-trends', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hot lead trends')
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
      { label: 'Hot leads today', value: String(data.kpis.hotToday.value), change: data.kpis.hotToday.change, icon: HiOutlineFire, color: '#ef4444' },
      { label: 'Hot leads (7d)', value: String(data.kpis.hot7d.value), change: data.kpis.hot7d.change, icon: HiOutlineFire, color: '#f59e0b' },
      { label: 'Conversion rate', value: `${data.kpis.conversionRate.value.toFixed(2)}%`, change: data.kpis.conversionRate.change, icon: HiOutlineFire, color: '#22c55e' },
      { label: 'Avg score (hot)', value: String(data.kpis.avgHotScore.value), change: data.kpis.avgHotScore.change, icon: HiOutlineFire, color: '#7c3aed' },
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
        <h1 className="analytics-title">Hot Lead Trends</h1>
        <p className="analytics-desc">Monitor hot lead volume and conversion trends.</p>
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
          <div className="analytics-chart-title">Leads by temperature (last 5 days)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.hotByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="hot" fill="#ef4444" name="Hot" radius={[4, 4, 0, 0]} />
              <Bar dataKey="warm" fill="#f59e0b" name="Warm" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cold" fill="#94a3b8" name="Cold" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card chart-wide">
          <div className="analytics-chart-title">Hot leads by source</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.hotSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {data.hotSources.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

