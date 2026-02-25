import React, { useState } from 'react'
import { HiOutlineSpeakerphone, HiOutlinePlus, HiOutlineExternalLink } from 'react-icons/hi'
import { SiFacebook } from 'react-icons/si'
import './AllCampaigns.css'

type Campaign = {
  id: string
  name: string
  source: 'facebook'
  status: 'active' | 'paused' | 'draft'
  leads: number
  clicks: number
  conversions: number
  started: string
}

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Summer Sale - Product A', source: 'facebook', status: 'active', leads: 124, clicks: 892, conversions: 14, started: '2024-02-01' },
  { id: '2', name: 'WhatsApp Lead Form', source: 'facebook', status: 'active', leads: 89, clicks: 456, conversions: 20, started: '2024-02-10' },
  { id: '3', name: 'Catalogue Download Campaign', source: 'facebook', status: 'paused', leads: 56, clicks: 312, conversions: 8, started: '2024-01-15' },
  { id: '4', name: 'Retargeting - Hot Leads', source: 'facebook', status: 'draft', leads: 0, clicks: 0, conversions: 0, started: '—' },
]

export const AllCampaigns: React.FC = () => {
  const [campaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'all') return true
    return c.status === filter
  })

  return (
    <div className="all-campaigns-page">
      <header className="all-campaigns-header">
        <div>
          <h1 className="all-campaigns-title">
            <HiOutlineSpeakerphone size={24} />
            All Campaigns
          </h1>
          <p className="all-campaigns-desc">
            Track your Facebook ad campaigns and other lead sources sending traffic to WhatsApp.
          </p>
        </div>
        <button type="button" className="all-campaigns-add-btn">
          <HiOutlinePlus size={18} />
          Add campaign
        </button>
      </header>

      <div className="all-campaigns-filters">
        {(['all', 'active', 'paused'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Paused'}
          </button>
        ))}
      </div>

      <div className="all-campaigns-grid">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="campaign-card">
            <div className="campaign-card-header">
              <div className="campaign-source">
                <SiFacebook size={20} />
                <span>Facebook Ads</span>
              </div>
              <span className={`campaign-status ${campaign.status}`}>{campaign.status}</span>
            </div>
            <h3 className="campaign-name">{campaign.name}</h3>
            <div className="campaign-stats">
              <div className="campaign-stat">
                <span className="stat-value">{campaign.leads.toLocaleString()}</span>
                <span className="stat-label">Leads</span>
              </div>
              <div className="campaign-stat">
                <span className="stat-value">{campaign.clicks.toLocaleString()}</span>
                <span className="stat-label">Clicks</span>
              </div>
              <div className="campaign-stat">
                <span className="stat-value">{campaign.conversions}</span>
                <span className="stat-label">Conv%</span>
              </div>
            </div>
            <div className="campaign-footer">
              <span className="campaign-started">Started {campaign.started}</span>
              <button type="button" className="campaign-link-btn" title="View in Facebook">
                <HiOutlineExternalLink size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="all-campaigns-empty">
          <HiOutlineSpeakerphone size={48} className="empty-icon" />
          <p>No campaigns found</p>
          <span className="empty-hint">
            {filter === 'all' ? 'Connect a Facebook campaign to get started' : `No ${filter} campaigns`}
          </span>
        </div>
      )}
    </div>
  )
}
