import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { HiOutlineUser } from 'react-icons/hi'
import './Analytics.css'

const AGENT_KPIS = [
  { label: 'Takeovers today', value: '89', change: '+18%', icon: HiOutlineUser, color: '#22c55e' },
  { label: 'Avg response', value: '2.4m', change: '-12%', icon: HiOutlineUser, color: '#3b82f6' },
  { label: 'Resolved by agents', value: '312', change: '+8%', icon: HiOutlineUser, color: '#7c3aed' },
  { label: 'Satisfaction', value: '94%', change: '+3%', icon: HiOutlineUser, color: '#f59e0b' },
]

const AGENT_BY_NAME = [
  { name: 'Sarah K', takeovers: 42, resolved: 38 },
  { name: 'Mike T', takeovers: 38, resolved: 35 },
  { name: 'You', takeovers: 35, resolved: 32 },
  { name: 'Lisa M', takeovers: 28, resolved: 25 },
]

const TAKEOVER_BY_HOUR = [
  { hour: '9am', count: 12 },
  { hour: '12pm', count: 24 },
  { hour: '3pm', count: 28 },
  { hour: '6pm', count: 18 },
  { hour: '9pm', count: 7 },
]

export const AgentPerformance: React.FC = () => {
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Agent Performance</h1>
        <p className="analytics-desc">Monitor human agent takeovers and resolution.</p>
      </header>
      <div className="analytics-kpis">
        {AGENT_KPIS.map((kpi) => {
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
          <div className="analytics-chart-title">Agent takeovers & resolutions</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={AGENT_BY_NAME}>
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
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Takeovers by hour (today)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={TAKEOVER_BY_HOUR}>
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
