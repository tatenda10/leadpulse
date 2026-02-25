import React, { useState } from 'react'
import { HiOutlineKey, HiOutlinePlus } from 'react-icons/hi'
import './Settings.css'

type ApiKey = { id: string; name: string; key: string; created: string }

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production', key: 'lp_sk_••••••••••••••••abcd', created: 'Feb 1, 2024' },
]

export const SettingsApiKeys: React.FC = () => {
  const [keys] = useState<ApiKey[]>(MOCK_KEYS)

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">
          <HiOutlineKey size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          API Keys
        </h1>
        <p className="settings-desc">Manage API keys for integrations and external access.</p>
      </header>
      <div className="settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="settings-section-title" style={{ margin: 0 }}>Your keys</h3>
          <button type="button" className="settings-save-btn" style={{ margin: 0 }}>
            <HiOutlinePlus size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Create key
          </button>
        </div>
        {keys.map((k) => (
          <div key={k.id} className="settings-section" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{k.name}</div>
            <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{k.key}</div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>Created {k.created}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
