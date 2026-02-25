import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { HiOutlineTrendingUp } from 'react-icons/hi'
import './CampaignPerformance.css'

const CAMPAIGN_KPIS = [
  { label: 'Total leads', value: '269', change: '+18%', icon: HiOutlineTrendingUp, color: '#7c3aed' },
  { label: 'Click-through rate', value: '4.2%', change: '+0.8%', icon: HiOutlineTrendingUp, color: '#22c55e' },
  { label: 'Conversion rate', value: '16%', change: '+3%', icon: HiOutlineTrendingUp, color: '#3b82f6' },
  { label: 'Cost per lead', value: '$2.40', change: '-12%', icon: HiOutlineTrendingUp, color: '#f59e0b' },
]

const LEADS_BY_CAMPAIGN = [
  { name: 'Summer Sale', leads: 124, clicks: 892 },
  { name: 'WhatsApp Lead Form', leads: 89, clicks: 456 },
  { name: 'Catalogue Download', leads: 56, clicks: 312 },
]

const LEADS_BY_SOURCE = [
  { name: 'Facebook Ads', value: 68, color: '#1877f2' },
  { name: 'WhatsApp Links', value: 24, color: '#25d366' },
  { name: 'Organic', value: 8, color: '#94a3b8' },
]

const WEEKLY_LEADS = [
  { week: 'W1', leads: 52 },
  { week: 'W2', leads: 68 },
  { week: 'W3', leads: 61 },
  { week: 'W4', leads: 88 },
]

export const CampaignPerformance: React.FC = () => {
  return (
    <div className="campaign-performance-page">
      <header className="campaign-performance-header">
        <div>
          <h1 className="campaign-performance-title">Campaign Performance</h1>
          <p className="campaign-performance-desc">
            Track leads, conversions, and ROI from your ad campaigns.
          </p>
        </div>
      </header>

      <div className="campaign-performance-kpis">
        {CAMPAIGN_KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="campaign-kpi-card">
              <div className="campaign-kpi-icon" style={{ color: kpi.color }}>
                <Icon size={22} />
              </div>
              <div className="campaign-kpi-label">{kpi.label}</div>
              <div className="campaign-kpi-value">{kpi.value}</div>
              <div className="campaign-kpi-change">{kpi.change} vs last period</div>
            </div>
          )
        })}
      </div>

      <div className="campaign-performance-charts">
        <div className="campaign-chart-card">
          <div className="campaign-chart-title">Leads by campaign</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={LEADS_BY_CAMPAIGN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="leads" fill="#7c3aed" name="Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="#94a3b8" name="Clicks" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="campaign-chart-card">
          <div className="campaign-chart-title">Leads by source</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={LEADS_BY_SOURCE}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {LEADS_BY_SOURCE.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="campaign-performance-charts campaign-chart-full">
        <div className="campaign-chart-card">
          <div className="campaign-chart-title">Weekly leads trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={WEEKLY_LEADS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed' }}
                name="Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
