import React from 'react'
import {
  BarChart,
  Bar,
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
import { HiOutlineFire } from 'react-icons/hi'
import './Analytics.css'

const HOT_KPIS = [
  { label: 'Hot leads today', value: '28', change: '+15%', icon: HiOutlineFire, color: '#ef4444' },
  { label: 'Hot leads (7d)', value: '156', change: '+22%', icon: HiOutlineFire, color: '#f59e0b' },
  { label: 'Conversion rate', value: '18%', change: '+4%', icon: HiOutlineFire, color: '#22c55e' },
  { label: 'Avg score (hot)', value: '84', change: '+2', icon: HiOutlineFire, color: '#7c3aed' },
]

const HOT_BY_DAY = [
  { day: 'Mon', hot: 18, warm: 42, cold: 85 },
  { day: 'Tue', hot: 22, warm: 48, cold: 92 },
  { day: 'Wed', hot: 19, warm: 45, cold: 88 },
  { day: 'Thu', hot: 25, warm: 52, cold: 95 },
  { day: 'Fri', hot: 28, warm: 55, cold: 98 },
]

const HOT_SOURCES = [
  { name: 'Facebook Ads', value: 62, color: '#1877f2' },
  { name: 'WhatsApp Links', value: 24, color: '#25d366' },
  { name: 'Organic', value: 14, color: '#94a3b8' },
]

export const HotLeadTrends: React.FC = () => {
  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1 className="analytics-title">Hot Lead Trends</h1>
        <p className="analytics-desc">Monitor hot lead volume and conversion trends.</p>
      </header>
      <div className="analytics-kpis">
        {HOT_KPIS.map((kpi) => {
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
          <div className="analytics-chart-title">Leads by temperature (last 5 days)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={HOT_BY_DAY}>
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
        <div className="analytics-chart-card">
          <div className="analytics-chart-title">Hot leads by source</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={HOT_SOURCES}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {HOT_SOURCES.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
