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
import { HiOutlineClock, HiOutlineChip, HiOutlineUser, HiOutlineTrendingUp } from 'react-icons/hi'
import './Performance.css'

const PERF_CARDS = [
  { label: 'Avg Bot Response', value: '1.2s', change: '-8%', trend: 'down', icon: HiOutlineClock, iconColor: '#3b82f6' },
  { label: 'Bot Resolution Rate', value: '72%', change: '+6%', trend: 'up', icon: HiOutlineChip, iconColor: '#6366f1' },
  { label: 'Human Takeover Rate', value: '28%', change: '+3%', trend: 'up', icon: HiOutlineUser, iconColor: '#22c55e' },
  { label: 'Lead Conversion', value: '14%', change: '+11%', trend: 'up', icon: HiOutlineTrendingUp, iconColor: '#8b5cf6' },
]

const RESPONSE_TIME_TREND = [
  { day: 'Mon', bot: 1.4, human: 3.2 },
  { day: 'Tue', bot: 1.2, human: 2.8 },
  { day: 'Wed', bot: 1.3, human: 2.9 },
  { day: 'Thu', bot: 1.1, human: 2.5 },
  { day: 'Fri', bot: 1.2, human: 2.7 },
  { day: 'Sat', bot: 1.3, human: 3.0 },
  { day: 'Sun', bot: 1.2, human: 2.6 },
]

const RESOLUTION_BY_HOUR = [
  { hour: '9am', bot: 45, human: 12 },
  { hour: '12pm', bot: 62, human: 18 },
  { hour: '3pm', bot: 58, human: 22 },
  { hour: '6pm', bot: 42, human: 15 },
  { hour: '9pm', bot: 28, human: 8 },
]

const WEEKLY_PERFORMANCE = [
  { week: 'W1', resolved: 142, escalated: 38 },
  { week: 'W2', resolved: 168, escalated: 52 },
  { week: 'W3', resolved: 155, escalated: 45 },
  { week: 'W4', resolved: 189, escalated: 56 },
]

export const Performance: React.FC = () => {
  return (
    <div className="performance-page">
      <div className="performance-cards">
        {PERF_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="perf-card">
              <div className="perf-card-icon" style={{ color: card.iconColor }}>
                <Icon size={22} />
              </div>
              <div className="perf-card-label">{card.label}</div>
              <div className="perf-card-value">{card.value}</div>
              <div className={`perf-card-change ${card.trend}`}>{card.change} vs last week</div>
            </div>
          )
        })}
      </div>
      <div className="performance-charts">
        <div className="chart-card chart-wide">
          <div className="chart-title">Response Time (Bot vs Human)</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={RESPONSE_TIME_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit="s" />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="bot"
                name="Bot (sec)"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="human"
                name="Human (min)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Resolutions by Hour (Today)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={RESOLUTION_BY_HOUR}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
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
            <BarChart data={WEEKLY_PERFORMANCE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
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
