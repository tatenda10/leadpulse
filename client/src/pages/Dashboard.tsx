import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HiOutlineChat, HiOutlineFire, HiOutlineChip, HiOutlineClock } from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

type OverviewResponse = {
  kpis: {
    totalConversations: { value: number; change: string; trend: 'up' | 'down' }
    hotLeads: { value: number; change: string; trend: 'up' | 'down' }
    botHandled: { value: number; change: string; trend: 'up' | 'down' }
    avgResponseTimeMinutes: { value: number; change: string; trend: 'up' | 'down' }
  }
  quickStats: {
    liveChatsNow: number
    unreadMessages: number
    needsAttention: number
  }
  conversationsByDay: Array<{ day: string; incoming: number; outgoing: number }>
  leadSources: Array<{ name: string; value: number; color: string }>
  weeklyTrends: Array<{ week: string; conversations: number; hotLeads: number }>
  botVsHuman: Array<{ day: string; bot: number; human: number }>
  leadsByStatus: Array<{ day: string; hot: number; warm: number; cold: number }>
  responseTimeDist: Array<{ name: string; value: number; fill: string }>
}

export const Dashboard: React.FC = () => {
  const { token } = useAuth()
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<OverviewResponse>('/analytics/overview', { token })
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load overview data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const kpiCards = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Total Conversations', value: data.kpis.totalConversations.value.toLocaleString(), change: data.kpis.totalConversations.change, trend: data.kpis.totalConversations.trend, icon: HiOutlineChat, iconColor: '#8b5cf6' },
      { label: 'Hot Leads', value: data.kpis.hotLeads.value.toLocaleString(), change: data.kpis.hotLeads.change, trend: data.kpis.hotLeads.trend, icon: HiOutlineFire, iconColor: '#ef4444' },
      { label: 'Bot Handled', value: `${data.kpis.botHandled.value.toFixed(1)}%`, change: data.kpis.botHandled.change, trend: data.kpis.botHandled.trend, icon: HiOutlineChip, iconColor: '#6366f1' },
      { label: 'Avg Response Time', value: `${data.kpis.avgResponseTimeMinutes.value.toFixed(2)} min`, change: data.kpis.avgResponseTimeMinutes.change, trend: data.kpis.avgResponseTimeMinutes.trend, icon: HiOutlineClock, iconColor: '#3b82f6' },
    ]
  }, [data])

  if (loading)
    return (
      <div className="dashboard-overview">
        <div className="dashboard-header">
          <div className="skeleton dashboard-title-skeleton" />
          <div className="skeleton dashboard-desc-skeleton" />
        </div>
        <div className="dashboard-cards">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="dashboard-card dashboard-card-skeleton">
              <div className="skeleton dashboard-card-icon-skeleton" />
              <div className="skeleton dashboard-card-label-skeleton" />
              <div className="skeleton dashboard-card-value-skeleton" />
            </div>
          ))}
        </div>
        <div className="dashboard-charts">
          <div className="chart-card chart-wide dashboard-chart-skeleton skeleton" />
          <div className="chart-card dashboard-chart-skeleton skeleton" />
        </div>
        <div className="dashboard-charts">
          <div className="chart-card chart-wide dashboard-chart-skeleton skeleton" />
          <div className="chart-card dashboard-chart-skeleton skeleton" />
        </div>
        <div className="dashboard-charts">
          <div className="chart-card chart-full dashboard-chart-skeleton skeleton" />
        </div>
      </div>
    )
  if (error) return <div className="dashboard-overview"><div className="chart-card">{error}</div></div>
  if (!data) return <div className="dashboard-overview"><div className="chart-card">No data available</div></div>

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-desc">Overview of your conversations, leads, and bot performance.</p>
      </div>
      <div className="dashboard-cards">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="dashboard-card">
              <div className="dashboard-card-icon" style={{ color: card.iconColor }}>
                <Icon size={22} />
              </div>
              <div className="dashboard-card-label">{card.label}</div>
              <div className="dashboard-card-value">{card.value}</div>
              <div className={`dashboard-card-change ${card.trend}`}>{card.change} vs last week</div>
            </div>
          )
        })}
      </div>
      <div className="dashboard-charts">
        <div className="chart-card chart-wide">
          <div className="chart-title">Conversations (Incoming vs Outgoing)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.conversationsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="incoming" name="Incoming" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outgoing" name="Outgoing" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Lead Sources</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.leadSources}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.leadSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="dashboard-charts">
        <div className="chart-card chart-wide">
          <div className="chart-title">Weekly Trends</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Line type="monotone" dataKey="conversations" name="Conversations" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
              <Line type="monotone" dataKey="hotLeads" name="Hot Leads" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card chart-summary">
          <div className="chart-title">Quick Stats</div>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-value">{data.quickStats.liveChatsNow}</span>
              <span className="quick-stat-label">Live chats now</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">{data.quickStats.unreadMessages}</span>
              <span className="quick-stat-label">Unread messages</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">{data.quickStats.needsAttention}</span>
              <span className="quick-stat-label">Needs attention</span>
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-charts dashboard-charts-three">
        <div className="chart-card chart-wide">
          <div className="chart-title">Bot vs Human Handled</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.botVsHuman}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Area type="monotone" dataKey="bot" name="Bot" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
              <Area type="monotone" dataKey="human" name="Human" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Response Time Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.responseTimeDist} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" name="Count" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                {data.responseTimeDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="dashboard-charts">
        <div className="chart-card chart-full">
          <div className="chart-title">Leads by Status (Hot / Warm / Cold)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.leadsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="hot" name="Hot" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="warm" name="Warm" stackId="a" fill="#f59e0b" />
              <Bar dataKey="cold" name="Cold" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

