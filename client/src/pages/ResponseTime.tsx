import React from 'react'
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HiOutlineClock } from 'react-icons/hi'
import './Analytics.css'

const RESPONSE_KPIS = [
  { label: 'Avg bot response', value: '1.2s', change: '-8%', icon: HiOutlineClock, color: '#6366f1' },
  { label: 'Avg human response', value: '2.4m', change: '-15%', icon: HiOutlineClock, color: '#22c55e' },
  { label: '< 1 min', value: '68%', change: '+12%', icon: HiOutlineClock, color: '#22c55e' },
  { label: '> 5 min', value: '8%', change: '-5%', icon: HiOutlineClock, color: '#ef4444' },
]

const BOT_VS_HUMAN = [
  { day: 'Mon', bot: 1.4, human: 3.2 },
  { day: 'Tue', bot: 1.2, human: 2.8 },
  { day: 'Wed', bot: 1.3, human: 2.9 },
  { day: 'Thu', bot: 1.1, human: 2.5 },
  { day: 'Fri', bot: 1.2, human: 2.7 },
]

const RESPONSE_DIST = [
  { range: '< 1 min', count: 68, fill: '#22c55e' },
  { range: '1–3 min', count: 22, fill: '#3b82f6' },
  { range: '3–5 min', count: 8, fill: '#f59e0b' },
  { range: '> 5 min', count: 2, fill: '#ef4444' },
]

export const ResponseTime: React.FC = () => {
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Response Time</h1>
        <p className="analytics-desc">Track bot and agent response times.</p>
      </header>
      <div className="analytics-kpis">
        {RESPONSE_KPIS.map((kpi) => {
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
          <div className="analytics-chart-title">Bot vs Human response time</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={BOT_VS_HUMAN}>
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
            <BarChart data={RESPONSE_DIST} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="range" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" name="%" radius={[0, 4, 4, 0]}>
                {RESPONSE_DIST.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
