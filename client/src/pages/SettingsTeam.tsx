import React, { useState } from 'react'
import { HiOutlineUserGroup, HiOutlinePlus } from 'react-icons/hi'
import './Settings.css'

type Member = { id: string; name: string; email: string; role: string }

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'You', email: 'admin@leadpulse.com', role: 'Admin' },
  { id: '2', name: 'Sarah K', email: 'sarah@leadpulse.com', role: 'Agent' },
  { id: '3', name: 'Mike T', email: 'mike@leadpulse.com', role: 'Agent' },
]

export const SettingsTeam: React.FC = () => {
  const [members] = useState<Member[]>(MOCK_MEMBERS)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineUserGroup size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Team
        </h1>
        <p className="settings-desc">Manage team members and their roles.</p>
      </header>
      <div className="settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="settings-section-title" style={{ margin: 0 }}>Team members</h3>
          <button type="button" className="settings-save-btn" style={{ margin: 0 }}>
            <HiOutlinePlus size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Invite
          </button>
        </div>
        {members.map((m) => (
          <div key={m.id} className="settings-toggle-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.email}</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)' }}>{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
