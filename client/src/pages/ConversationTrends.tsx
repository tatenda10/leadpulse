import React from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HiOutlineChat, HiOutlineTrendingUp } from 'react-icons/hi'
import './Analytics.css'

const CONV_KPIS = [
  { label: 'Total conversations', value: '1,247', change: '+12%', icon: HiOutlineChat, color: '#7c3aed' },
  { label: 'New this week', value: '312', change: '+18%', icon: HiOutlineTrendingUp, color: '#22c55e' },
  { label: 'Resolved', value: '892', change: '+8%', icon: HiOutlineChat, color: '#3b82f6' },
  { label: 'Escalated', value: '156', change: '+5%', icon: HiOutlineTrendingUp, color: '#f59e0b' },
]

const DAILY_CONVERSATIONS = [
  { day: 'Mon', new: 142, resolved: 128 },
  { day: 'Tue', new: 168, resolved: 145 },
  { day: 'Wed', new: 135, resolved: 132 },
  { day: 'Thu', new: 189, resolved: 168 },
  { day: 'Fri', new: 172, resolved: 156 },
  { day: 'Sat', new: 98, resolved: 89 },
  { day: 'Sun', new: 76, resolved: 74 },
]

const WEEKLY_TREND = [
  { week: 'W1', conversations: 892 },
  { week: 'W2', conversations: 968 },
  { week: 'W3', conversations: 1024 },
  { week: 'W4', conversations: 1180 },
]

export const ConversationTrends: React.FC = () => {
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Conversation Trends</h1>
        <p className="analytics-desc">Track conversation volume and resolution over time.</p>
      </header>
      <div className="analytics-kpis">
        {CONV_KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="analytics-kpi-card">
              <div className="analytics-kpi-icon" style={{ color: kpi.color }}>
                <Icon size={22} />
              </div>
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
            <AreaChart data={DAILY_CONVERSATIONS}>
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
            <LineChart data={WEEKLY_TREND}>
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
