import React from 'react'
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
import { HiOutlineChip } from 'react-icons/hi'
import './Analytics.css'

const BOT_KPIS = [
  { label: 'Bot resolution rate', value: '72%', change: '+6%', icon: HiOutlineChip, color: '#6366f1' },
  { label: 'Avg response time', value: '1.2s', change: '-8%', icon: HiOutlineChip, color: '#22c55e' },
  { label: 'Handled today', value: '312', change: '+12%', icon: HiOutlineChip, color: '#7c3aed' },
  { label: 'Fallback rate', value: '12%', change: '-2%', icon: HiOutlineChip, color: '#f59e0b' },
]

const BOT_BY_DAY = [
  { day: 'Mon', resolved: 142, escalated: 38 },
  { day: 'Tue', resolved: 168, escalated: 42 },
  { day: 'Wed', resolved: 155, escalated: 35 },
  { day: 'Thu', resolved: 189, escalated: 48 },
  { day: 'Fri', resolved: 172, escalated: 45 },
]

const RESPONSE_TIME = [
  { day: 'Mon', bot: 1.4 },
  { day: 'Tue', bot: 1.2 },
  { day: 'Wed', bot: 1.3 },
  { day: 'Thu', bot: 1.1 },
  { day: 'Fri', bot: 1.2 },
]

export const BotPerformance: React.FC = () => {
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Bot Performance</h1>
        <p className="analytics-desc">Track chatbot resolution, response time, and escalation.</p>
      </header>
      <div className="analytics-kpis">
        {BOT_KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="analytics-kpi-card">
              <div className="analytics-kpi-icon" style={{ color: kpi.color }}>
                <Icon size={22} />
              </div>
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
            <BarChart data={BOT_BY_DAY}>
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
            <LineChart data={RESPONSE_TIME}>
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
