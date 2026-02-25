import React, { useState } from 'react'
import { SiFacebook } from 'react-icons/si'
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi'
import './FacebookSources.css'

type FacebookSource = {
  id: string
  name: string
  accountId: string
  status: 'connected' | 'pending'
  adAccounts: number
  leadsLast30Days: number
}

const MOCK_SOURCES: FacebookSource[] = [
  { id: '1', name: 'LeadPulse Business', accountId: 'act_123456789', status: 'connected', adAccounts: 2, leadsLast30Days: 312 },
  { id: '2', name: 'Partner Agency', accountId: 'act_987654321', status: 'pending', adAccounts: 1, leadsLast30Days: 0 },
]

export const FacebookSources: React.FC = () => {
  const [sources] = useState<FacebookSource[]>(MOCK_SOURCES)

  return (
    <div className="facebook-sources-page">
      <header className="facebook-sources-header">
        <div>
          <h1 className="facebook-sources-title">
            <SiFacebook size={24} />
            Facebook Sources
          </h1>
          <p className="facebook-sources-desc">
            Connect your Facebook ad accounts to track leads from ads to WhatsApp.
          </p>
        </div>
        <button type="button" className="facebook-sources-connect-btn">
          <HiOutlinePlus size={18} />
          Connect account
        </button>
      </header>

      <div className="facebook-sources-list">
        {sources.map((source) => (
          <div key={source.id} className="facebook-source-card">
            <div className="facebook-source-icon">
              <SiFacebook size={32} />
            </div>
            <div className="facebook-source-content">
              <div className="facebook-source-header">
                <h3 className="facebook-source-name">{source.name}</h3>
                <span className={`facebook-source-status ${source.status}`}>
                  {source.status === 'connected' ? (
                    <>
                      <HiOutlineCheckCircle size={16} />
                      Connected
                    </>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div className="facebook-source-meta">
                <span>Ad account: {source.accountId}</span>
                <span>{source.adAccounts} ad account(s)</span>
              </div>
              <div className="facebook-source-stats">
                <span className="stat-value">{source.leadsLast30Days}</span>
                <span className="stat-label">Leads (30 days)</span>
              </div>
            </div>
            {source.status === 'connected' && (
              <button type="button" className="facebook-source-manage-btn">
                Manage
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
