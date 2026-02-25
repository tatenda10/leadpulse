import React from 'react'
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
import './Dashboard.css'

const KPI_CARDS = [
  { label: 'Total Conversations', value: '1,247', change: '+12%', trend: 'up', icon: HiOutlineChat, iconColor: '#8b5cf6' },
  { label: 'Hot Leads', value: '89', change: '+8%', trend: 'up', icon: HiOutlineFire, iconColor: '#ef4444' },
  { label: 'Bot Handled', value: '68%', change: '+5%', trend: 'up', icon: HiOutlineChip, iconColor: '#6366f1' },
  { label: 'Avg Response Time', value: '2.4 min', change: '-15%', trend: 'down', icon: HiOutlineClock, iconColor: '#3b82f6' },
]

const CONVERSATIONS_BY_DAY = [
  { day: 'Mon', incoming: 45, outgoing: 38 },
  { day: 'Tue', incoming: 52, outgoing: 44 },
  { day: 'Wed', incoming: 38, outgoing: 35 },
  { day: 'Thu', incoming: 61, outgoing: 52 },
  { day: 'Fri', incoming: 55, outgoing: 48 },
  { day: 'Sat', incoming: 42, outgoing: 39 },
  { day: 'Sun', incoming: 35, outgoing: 30 },
]

const LEAD_SOURCES = [
  { name: 'Facebook Ads', value: 42, color: '#7c3aed' },
  { name: 'WhatsApp Links', value: 28, color: '#22c55e' },
  { name: 'Organic', value: 18, color: '#3b82f6' },
  { name: 'Other', value: 12, color: '#94a3b8' },
]

const WEEKLY_TRENDS = [
  { week: 'W1', conversations: 180, hotLeads: 18 },
  { week: 'W2', conversations: 220, hotLeads: 24 },
  { week: 'W3', conversations: 195, hotLeads: 22 },
  { week: 'W4', conversations: 245, hotLeads: 31 },
]

const BOT_VS_HUMAN = [
  { day: 'Mon', bot: 32, human: 13 },
  { day: 'Tue', bot: 38, human: 14 },
  { day: 'Wed', bot: 28, human: 10 },
  { day: 'Thu', bot: 42, human: 19 },
  { day: 'Fri', bot: 39, human: 16 },
  { day: 'Sat', bot: 30, human: 12 },
  { day: 'Sun', bot: 24, human: 11 },
]

const LEADS_BY_STATUS = [
  { day: 'Mon', hot: 8, warm: 15, cold: 22 },
  { day: 'Tue', hot: 12, warm: 18, cold: 22 },
  { day: 'Wed', hot: 6, warm: 14, cold: 18 },
  { day: 'Thu', hot: 14, warm: 20, cold: 27 },
  { day: 'Fri', hot: 11, warm: 17, cold: 27 },
]

const RESPONSE_TIME_DIST = [
  { name: '< 1 min', value: 45, fill: '#22c55e' },
  { name: '1–3 min', value: 32, fill: '#3b82f6' },
  { name: '3–5 min', value: 15, fill: '#f59e0b' },
  { name: '> 5 min', value: 8, fill: '#ef4444' },
]

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-cards">
        {KPI_CARDS.map((card) => {
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
            <BarChart data={CONVERSATIONS_BY_DAY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
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
                data={LEAD_SOURCES}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {LEAD_SOURCES.map((entry, index) => (
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
            <LineChart data={WEEKLY_TRENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversations"
                name="Conversations"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="hotLeads"
                name="Hot Leads"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card chart-summary">
          <div className="chart-title">Quick Stats</div>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-value">23</span>
              <span className="quick-stat-label">Live chats now</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">156</span>
              <span className="quick-stat-label">Unread messages</span>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-value">12</span>
              <span className="quick-stat-label">Needs attention</span>
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-charts dashboard-charts-three">
        <div className="chart-card chart-wide">
          <div className="chart-title">Bot vs Human Handled</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={BOT_VS_HUMAN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
              <Legend />
              <Area type="monotone" dataKey="bot" name="Bot" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
              <Area type="monotone" dataKey="human" name="Human" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Response Time Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={RESPONSE_TIME_DIST} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" name="Leads" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                {RESPONSE_TIME_DIST.map((entry, index) => (
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
            <BarChart data={LEADS_BY_STATUS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#334155' }}
              />
              <Legend />
              <Bar dataKey="hot" name="Hot" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="warm" name="Warm" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cold" name="Cold" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
