import React, { useState } from 'react'
import { HiOutlineLockClosed } from 'react-icons/hi'
import './Settings.css'

type Permission = { id: string; name: string; description: string; admin: boolean; agent: boolean; viewer: boolean }

const MOCK_PERMS: Permission[] = [
  { id: '1', name: 'View conversations', description: 'Access chat list and messages', admin: true, agent: true, viewer: true },
  { id: '2', name: 'Take over chats', description: 'Transfer bot to human handling', admin: true, agent: true, viewer: false },
  { id: '3', name: 'Manage contacts', description: 'Add, edit, delete contacts', admin: true, agent: true, viewer: false },
  { id: '4', name: 'Bot configuration', description: 'Edit auto replies, welcome message', admin: true, agent: false, viewer: false },
  { id: '5', name: 'Settings', description: 'Access account and team settings', admin: true, agent: false, viewer: false },
]

export const SettingsPermissions: React.FC = () => {
  const [perms] = useState<Permission[]>(MOCK_PERMS)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineLockClosed size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Permissions
        </h1>
        <p className="settings-desc">Configure permissions for each role.</p>
      </header>
      <div className="settings-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Permission</span>
          <span>Admin</span>
          <span>Agent</span>
          <span>Viewer</span>
        </div>
        {perms.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.description}</div>
            </div>
            <span style={{ color: p.admin ? '#22c55e' : 'var(--text-light)' }}>{p.admin ? '✓' : '—'}</span>
            <span style={{ color: p.agent ? '#22c55e' : 'var(--text-light)' }}>{p.agent ? '✓' : '—'}</span>
            <span style={{ color: p.viewer ? '#22c55e' : 'var(--text-light)' }}>{p.viewer ? '✓' : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
