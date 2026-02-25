import React, { useState } from 'react'
import { HiOutlineShieldCheck } from 'react-icons/hi'
import './Settings.css'

type Role = { id: string; name: string; description: string; members: number }

const MOCK_ROLES: Role[] = [
  { id: '1', name: 'Admin', description: 'Full access to all settings and features', members: 1 },
  { id: '2', name: 'Agent', description: 'Can handle chats and view contacts', members: 2 },
  { id: '3', name: 'Viewer', description: 'Read-only access to dashboard and reports', members: 0 },
]

export const SettingsRoles: React.FC = () => {
  const [roles] = useState<Role[]>(MOCK_ROLES)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineShieldCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Roles
        </h1>
        <p className="settings-desc">Define roles for your team members.</p>
      </header>
      <div className="settings-card">
        {roles.map((r) => (
          <div key={r.id} className="settings-section" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{r.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{r.description}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{r.members} member(s)</div>
              </div>
              <button type="button" style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
