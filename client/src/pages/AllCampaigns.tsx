import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { HiOutlineArrowLeft, HiOutlineChip, HiOutlineExternalLink, HiOutlineSpeakerphone, HiOutlineX } from 'react-icons/hi'
import { SiFacebook } from 'react-icons/si'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
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
  externalUrl?: string
  accountName?: string
}

type Metrics = {
  leads: number
  clicks: number
  conversionRate: number
  impressions: number | null
  reach: number | null
  frequency: number | null
  spend: number | null
  cpc: number | null
  cpm: number | null
  ctr: number | null
  inlineLinkClicks: number | null
  uniqueInlineLinkClicks: number | null
  costPerInlineLinkClick: number | null
}

type AdCreative = {
  mediaType: 'image' | 'video' | null
  imageUrl: string | null
  thumbnailUrl: string | null
  videoId: string | null
  videoUrl: string | null
  permalinkUrl: string | null
}

type AdDetails = {
  id: string
  name: string
  status: string
  adSetId: string | null
  createdTime: string | null
  creative?: AdCreative
  metrics: Metrics | null
}

type CampaignDetails = {
  id: string
  name: string
  status: string
  objective: string | null
  accountId: string
  accountName: string
  started: string | null
  lastSourceUpdateAt: string | null
  syncedAt: string | null
  buyingType?: string | null
  bidStrategy?: string | null
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  startTime?: string | null
  stopTime?: string | null
  createdTime?: string | null
  metrics: Metrics
  billing: {
    currency: string | null
    accountSpend: number | null
    accountBalance: number | null
    accountSpendCap: number | null
  }
  adSets: Array<{
    id: string
    name: string
    status: string
    startTime: string | null
    endTime: string | null
    bidStrategy: string | null
    dailyBudget: number | null
    lifetimeBudget: number | null
    metrics: Metrics | null
    ads: AdDetails[]
  }>
  ads: AdDetails[]
  locationBreakdown: Array<{
    country: string
    leads: number
    clicks: number
    conversionRate: number
    impressions: number | null
    reach: number | null
    frequency: number | null
    spend: number | null
    cpc: number | null
    cpm: number | null
    ctr: number | null
    inlineLinkClicks: number | null
    uniqueInlineLinkClicks: number | null
    costPerInlineLinkClick: number | null
  }>
  externalUrl?: string
}

type CampaignsResponse = {
  campaigns: Campaign[]
  meta?: {
    total?: number
    lastSyncedAt?: string | null
  }
}

type CampaignDetailsResponse = {
  campaign: CampaignDetails
}

type FacebookStatusResponse = {
  connected: boolean
}

type BreakdownResponse = {
  breakdown: Array<{
    key: string
    dimension: string
    dimensionValue: string
    actionDimension: string | null
    actionDimensionValue: string | null
    leads: number
    clicks: number
    conversionRate: number
    impressions: number | null
    reach: number | null
    frequency: number | null
    spend: number | null
    cpc: number | null
    cpm: number | null
    ctr: number | null
    inlineLinkClicks: number | null
    uniqueInlineLinkClicks: number | null
    costPerInlineLinkClick: number | null
  }>
  meta: {
    mainBreakdown: string
    actionBreakdown: string | null
    fallbackWarning?: string | null
    total: number
  }
}

type DetailsTab = 'campaign' | 'metrics' | 'adsets'
type BreakdownPreset = 'audience' | 'geo' | 'placement' | 'time' | 'custom'
type ChatMessage = { role: 'bot' | 'user'; text: string }

function formatDate(value?: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

function formatMoney(value: number | null | undefined, currency: string | null): string {
  if (value === null || value === undefined) return '--'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency || ''}`.trim()
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return value.toLocaleString()
}

const AdCreativePreview: React.FC<{ ad: AdDetails }> = ({ ad }) => {
  const creative = ad.creative
  if (!creative || (!creative.imageUrl && !creative.thumbnailUrl && !creative.videoUrl && !creative.videoId)) {
    return <div className="ad-creative-empty">No media preview</div>
  }

  if (creative.videoUrl) {
    return (
      <video className="ad-creative-media" controls preload="metadata">
        <source src={creative.videoUrl} />
      </video>
    )
  }

  const imageSrc = creative.imageUrl || creative.thumbnailUrl
  if (imageSrc) {
    return <img className="ad-creative-media" src={imageSrc} alt={ad.name} loading="lazy" />
  }

  if (creative.videoId) {
    return <div className="ad-creative-empty">Video ID: {creative.videoId}</div>
  }

  return <div className="ad-creative-empty">No media preview</div>
}

function buildMetricsSummary(details: CampaignDetails, breakdownRows: BreakdownResponse['breakdown']): string {
  const topSpend = [...breakdownRows].sort((a, b) => (b.spend || 0) - (a.spend || 0))[0]
  const topClicks = [...breakdownRows].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0]
  const topLeads = [...breakdownRows].sort((a, b) => (b.leads || 0) - (a.leads || 0))[0]
  return `Summary: ${details.metrics.leads} leads from ${details.metrics.clicks} clicks (CTR ${details.metrics.ctr ?? 0}%). Top spend segment: ${topSpend?.key || 'n/a'}. Top clicks: ${topClicks?.key || 'n/a'}. Top leads: ${topLeads?.key || 'n/a'}.`
}

function buildBotReply(question: string, details: CampaignDetails, breakdownRows: BreakdownResponse['breakdown']): string {
  const q = question.toLowerCase()
  const bySpend = [...breakdownRows].sort((a, b) => (b.spend || 0) - (a.spend || 0))
  const byClicks = [...breakdownRows].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
  const byLeads = [...breakdownRows].sort((a, b) => (b.leads || 0) - (a.leads || 0))

  if (q.includes('summary') || q.includes('overview')) {
    return buildMetricsSummary(details, breakdownRows)
  }
  if (q.includes('best') && q.includes('click')) {
    return `Top click segment is ${byClicks[0]?.key || 'n/a'} with ${byClicks[0]?.clicks || 0} clicks.`
  }
  if ((q.includes('best') || q.includes('most')) && q.includes('lead')) {
    return `Top lead segment is ${byLeads[0]?.key || 'n/a'} with ${byLeads[0]?.leads || 0} leads.`
  }
  if (q.includes('spend') || q.includes('budget')) {
    return `Highest spend segment is ${bySpend[0]?.key || 'n/a'} at ${bySpend[0]?.spend || 0}. Campaign total spend is ${details.metrics.spend || 0}.`
  }
  if (q.includes('ctr')) {
    return `Campaign CTR is ${details.metrics.ctr ?? 0}%. Best segment by CTR is ${[...breakdownRows].sort((a, b) => (b.ctr || 0) - (a.ctr || 0))[0]?.key || 'n/a'}.`
  }
  if (q.includes('optimiz') || q.includes('improve')) {
    return `Focus budget on segments with high leads and lower cost per inline click. Current strongest lead segment: ${byLeads[0]?.key || 'n/a'}. Consider reducing spend on high-spend low-lead segments.`
  }
  return `I can help with summary, top spend/click/lead segments, CTR trends, and optimization suggestions.`
}

export const AllCampaigns: React.FC = () => {
  const { token } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<CampaignDetails | null>(null)
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('campaign')
  const [mainBreakdown, setMainBreakdown] = useState('country')
  const [actionBreakdown, setActionBreakdown] = useState('')
  const [breakdownRows, setBreakdownRows] = useState<BreakdownResponse['breakdown']>([])
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError, setBreakdownError] = useState<string | null>(null)
  const [breakdownWarning, setBreakdownWarning] = useState<string | null>(null)
  const [breakdownPreset, setBreakdownPreset] = useState<BreakdownPreset>('geo')
  const [graphMetric, setGraphMetric] = useState<'spend' | 'clicks' | 'leads' | 'ctr'>('spend')
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)

  const mainBreakdownOptions = [
    { value: 'country', label: 'Country' },
    { value: 'age', label: 'Age' },
    { value: 'gender', label: 'Gender' },
    { value: 'region', label: 'Region' },
    { value: 'dma', label: 'DMA (US)' },
    { value: 'impression_device', label: 'Impression Device' },
    { value: 'publisher_platform', label: 'Publisher Platform' },
    { value: 'platform_position', label: 'Platform Position' },
    { value: 'device_platform', label: 'Device Platform' },
    { value: 'hourly_stats_aggregated_by_advertiser_time_zone', label: 'Hourly (Advertiser TZ)' },
  ]

  const actionBreakdownOptions = [
    { value: '', label: 'None' },
    { value: 'action_type', label: 'Action Type' },
    { value: 'action_destination', label: 'Action Destination' },
    { value: 'action_device', label: 'Action Device' },
    { value: 'action_reaction', label: 'Action Reaction' },
    { value: 'action_video_sound', label: 'Action Video Sound' },
    { value: 'action_target_id', label: 'Action Target ID' },
  ]

  const loadCampaigns = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [campaignsResponse, statusResponse] = await Promise.all([
        apiRequest<CampaignsResponse>('/campaigns', { token }),
        apiRequest<FacebookStatusResponse>('/integrations/facebook/status', { token }),
      ])
      setCampaigns(campaignsResponse.campaigns ?? [])
      setLastSyncedAt(campaignsResponse.meta?.lastSyncedAt ?? null)
      setConnected(Boolean(statusResponse.connected))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  const handleSync = async () => {
    if (!token) return
    setSyncing(true)
    setError(null)
    try {
      await apiRequest('/campaigns/sync', { method: 'POST', token, body: {} })
      await loadCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync campaigns')
    } finally {
      setSyncing(false)
    }
  }

  const loadBreakdown = useCallback(
    async (campaignId: string, main: string, action: string) => {
      if (!token) return
      setBreakdownLoading(true)
      setBreakdownError(null)
      setBreakdownWarning(null)
      try {
        const query = new URLSearchParams({ main })
        if (action) query.set('action', action)
        const response = await apiRequest<BreakdownResponse>(`/campaigns/${campaignId}/breakdowns?${query.toString()}`, {
          token,
        })
        setBreakdownRows(response.breakdown ?? [])
        setBreakdownWarning(response.meta?.fallbackWarning || null)
        if ((response.meta?.actionBreakdown || '') !== action) {
          setActionBreakdown(response.meta?.actionBreakdown || '')
        }
      } catch (err) {
        setBreakdownError(err instanceof Error ? err.message : 'Failed to load breakdown')
        setBreakdownRows([])
      } finally {
        setBreakdownLoading(false)
      }
    },
    [token]
  )

  const openDetails = async (campaignId: string) => {
    if (!token) return
    setSelectedCampaignId(campaignId)
    setDetailsTab('campaign')
    setMainBreakdown('country')
    setActionBreakdown('')
    setBreakdownRows([])
    setBreakdownError(null)
    setBreakdownWarning(null)
    setBreakdownPreset('geo')
    setAssistantMessages([])
    setAssistantInput('')
    setAssistantOpen(false)
    setDetailsLoading(true)
    setDetailsError(null)
    setDetails(null)
    try {
      const response = await apiRequest<CampaignDetailsResponse>(`/campaigns/${campaignId}`, { token })
      setDetails(response.campaign)
      await loadBreakdown(campaignId, 'country', '')
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load campaign details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const applyBreakdownPreset = (preset: BreakdownPreset) => {
    setBreakdownPreset(preset)
    if (!selectedCampaignId) return

    if (preset === 'audience') {
      setMainBreakdown('age')
      setActionBreakdown('')
      void loadBreakdown(selectedCampaignId, 'age', '')
      return
    }
    if (preset === 'geo') {
      setMainBreakdown('region')
      setActionBreakdown('')
      void loadBreakdown(selectedCampaignId, 'region', '')
      return
    }
    if (preset === 'placement') {
      setMainBreakdown('platform_position')
      setActionBreakdown('')
      void loadBreakdown(selectedCampaignId, 'platform_position', '')
      return
    }
    if (preset === 'time') {
      setMainBreakdown('hourly_stats_aggregated_by_advertiser_time_zone')
      setActionBreakdown('')
      void loadBreakdown(selectedCampaignId, 'hourly_stats_aggregated_by_advertiser_time_zone', '')
      return
    }
  }

  useEffect(() => {
    if (!details) return
    if (assistantMessages.length > 0) return
    if (breakdownRows.length === 0) return
    setAssistantMessages([{ role: 'bot', text: buildMetricsSummary(details, breakdownRows) }])
  }, [details, breakdownRows, assistantMessages.length])

  const askAssistant = (question: string) => {
    if (!details) return
    const trimmed = question.trim()
    if (!trimmed) return
    const reply = buildBotReply(trimmed, details, breakdownRows)
    setAssistantMessages((prev) => [...prev, { role: 'user', text: trimmed }, { role: 'bot', text: reply }])
    setAssistantInput('')
  }

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        if (filter === 'all') return true
        return campaign.status === filter
      }),
    [campaigns, filter]
  )

  if (selectedCampaignId) {
    return (
      <div className="all-campaigns-page">
        <header className="all-campaigns-header">
          <div>
            <h1 className="all-campaigns-title">{details?.name || 'Campaign Details'}</h1>
            <p className="all-campaigns-desc">Campaign breakdown with tabs for overview, metrics, and ad sets.</p>
          </div>
          <div className="all-campaigns-actions">
            <button
              type="button"
              className="all-campaigns-back-btn"
              onClick={() => setSelectedCampaignId(null)}
            >
              <HiOutlineArrowLeft size={18} />
              Back
            </button>
            {details?.externalUrl && (
              <button
                type="button"
                className="all-campaigns-add-btn"
                onClick={() => window.open(details.externalUrl, '_blank', 'noopener,noreferrer')}
              >
                Open in Facebook
              </button>
            )}
          </div>
        </header>

        <div className="campaign-view-container">
          {detailsLoading && (
            <div className="campaign-view-loading">
              <div className="campaign-view-spinner" />
              <p>Loading details...</p>
            </div>
          )}
          {detailsError && !detailsLoading && <div className="all-campaigns-empty">{detailsError}</div>}

          {!detailsLoading && !detailsError && details && (
            <div className="campaign-details-page">
              <div className="campaign-tabs">
                {(['campaign', 'metrics', 'adsets'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`campaign-tab-btn ${detailsTab === tab ? 'active' : ''}`}
                    onClick={() => setDetailsTab(tab)}
                  >
                    {tab === 'campaign' ? 'Campaign' : tab === 'metrics' ? 'Performance Metrics' : 'Ad Sets'}
                  </button>
                ))}
              </div>

              {detailsTab === 'campaign' && (
                <>
                  <section className="campaign-details-section">
                    <h3>Campaign</h3>
                    <div className="campaign-details-grid">
                      <div><strong>Status:</strong> {details.status}</div>
                      <div><strong>Objective:</strong> {details.objective || '--'}</div>
                      <div><strong>Account:</strong> {details.accountName}</div>
                      <div><strong>Account ID:</strong> {details.accountId}</div>
                      <div><strong>Buying type:</strong> {details.buyingType || '--'}</div>
                      <div><strong>Bid strategy:</strong> {details.bidStrategy || '--'}</div>
                      <div><strong>Created:</strong> {formatDate(details.createdTime)}</div>
                      <div><strong>Started:</strong> {formatDate(details.startTime || details.started)}</div>
                      <div><strong>Ends:</strong> {formatDate(details.stopTime)}</div>
                      <div><strong>Daily budget:</strong> {formatMoney(details.dailyBudget, details.billing.currency)}</div>
                      <div><strong>Lifetime budget:</strong> {formatMoney(details.lifetimeBudget, details.billing.currency)}</div>
                      <div><strong>Last source update:</strong> {formatDate(details.lastSourceUpdateAt)}</div>
                    </div>
                  </section>
                  <section className="campaign-details-section">
                    <h3>Performance Metrics</h3>
                    <div className="campaign-details-grid">
                      <div><strong>Leads:</strong> {formatNumber(details.metrics.leads)}</div>
                      <div><strong>Clicks:</strong> {formatNumber(details.metrics.clicks)}</div>
                      <div><strong>Conv rate:</strong> {details.metrics.conversionRate}%</div>
                      <div><strong>Impressions:</strong> {formatNumber(details.metrics.impressions)}</div>
                      <div><strong>Reach:</strong> {formatNumber(details.metrics.reach)}</div>
                      <div><strong>Frequency:</strong> {details.metrics.frequency == null ? '--' : details.metrics.frequency.toFixed(2)}</div>
                      <div><strong>CTR:</strong> {details.metrics.ctr == null ? '--' : `${details.metrics.ctr}%`}</div>
                      <div><strong>Inline link clicks:</strong> {formatNumber(details.metrics.inlineLinkClicks)}</div>
                      <div><strong>Unique inline link clicks:</strong> {formatNumber(details.metrics.uniqueInlineLinkClicks)}</div>
                      <div><strong>Cost per inline link click:</strong> {formatMoney(details.metrics.costPerInlineLinkClick, details.billing.currency)}</div>
                      <div><strong>CPC:</strong> {formatMoney(details.metrics.cpc, details.billing.currency)}</div>
                      <div><strong>CPM:</strong> {formatMoney(details.metrics.cpm, details.billing.currency)}</div>
                      <div><strong>Spend:</strong> {formatMoney(details.metrics.spend, details.billing.currency)}</div>
                    </div>
                  </section>
                </>
              )}

              {detailsTab === 'metrics' && (
                <>
                  <section className="campaign-details-section campaign-metrics-summary">
                    <div className="campaign-metric-card">
                      <span className="campaign-metric-label">Leads</span>
                      <span className="campaign-metric-value">{formatNumber(details.metrics.leads)}</span>
                    </div>
                    <div className="campaign-metric-card">
                      <span className="campaign-metric-label">Clicks</span>
                      <span className="campaign-metric-value">{formatNumber(details.metrics.clicks)}</span>
                    </div>
                    <div className="campaign-metric-card">
                      <span className="campaign-metric-label">Spend</span>
                      <span className="campaign-metric-value">{formatMoney(details.metrics.spend, details.billing.currency)}</span>
                    </div>
                    <div className="campaign-metric-card">
                      <span className="campaign-metric-label">CTR</span>
                      <span className="campaign-metric-value">{details.metrics.ctr == null ? '--' : `${details.metrics.ctr}%`}</span>
                    </div>
                  </section>
                  <section className="campaign-details-section campaign-metrics-breakdown-section">
                    <div className="campaign-breakdown-header">
                      <h3>Breakdown by dimension</h3>
                      <div className="campaign-breakdown-presets-row">
                        <div className="campaign-preset-tabs">
                        {(
                          [
                            { key: 'audience', label: 'Audience' },
                            { key: 'geo', label: 'Geo' },
                            { key: 'placement', label: 'Placement' },
                            { key: 'time', label: 'Time' },
                            { key: 'custom', label: 'Custom' },
                          ] as const
                        ).map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            className={`campaign-preset-btn ${breakdownPreset === preset.key ? 'active' : ''}`}
                            onClick={() => applyBreakdownPreset(preset.key)}
                          >
                            {preset.label}
                          </button>
                        ))}
                        </div>
                        <div className="campaign-breakdown-controls">
                        <label>
                          Main
                          <select
                            value={mainBreakdown}
                            onChange={(event) => {
                              const nextMain = event.target.value
                              setBreakdownPreset('custom')
                              setMainBreakdown(nextMain)
                              if (selectedCampaignId) {
                                void loadBreakdown(selectedCampaignId, nextMain, actionBreakdown)
                              }
                            }}
                          >
                            {mainBreakdownOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Action
                          <select
                            value={actionBreakdown}
                            onChange={(event) => {
                              const nextAction = event.target.value
                              setBreakdownPreset('custom')
                              setActionBreakdown(nextAction)
                              if (selectedCampaignId) {
                                void loadBreakdown(selectedCampaignId, mainBreakdown, nextAction)
                              }
                            }}
                          >
                            {actionBreakdownOptions.map((option) => (
                              <option key={option.value || 'none'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        </div>
                      </div>
                    </div>
                    {breakdownWarning && <p className="all-campaigns-desc">{breakdownWarning}</p>}
                    {breakdownLoading ? (
                      <div className="campaign-breakdown-loading">
                        <div className="campaign-view-spinner" />
                        <p>Loading breakdown...</p>
                      </div>
                    ) : breakdownError ? (
                      <p className="all-campaigns-desc">{breakdownError}</p>
                    ) : breakdownRows.length === 0 ? (
                      <p className="all-campaigns-desc">No breakdown metrics available.</p>
                    ) : (
                      <>
                        <div className="campaign-graph-header">
                          <label>
                            Graph Metric
                            <select value={graphMetric} onChange={(event) => setGraphMetric(event.target.value as 'spend' | 'clicks' | 'leads' | 'ctr')}>
                              <option value="spend">Spend</option>
                              <option value="clicks">Clicks</option>
                              <option value="leads">Leads</option>
                              <option value="ctr">CTR</option>
                            </select>
                          </label>
                        </div>
                        <div className="chart-card campaign-breakdown-chart-card">
                          <div className="chart-title">
                            Breakdown by {graphMetric === 'spend' ? 'Spend' : graphMetric === 'clicks' ? 'Clicks' : graphMetric === 'leads' ? 'Leads' : 'CTR'}
                          </div>
                          <ResponsiveContainer width="100%" height={280}>
                              <BarChart
                                data={[...breakdownRows].slice(0, 12).map((row) => ({
                                  name: row.key,
                                  value:
                                    graphMetric === 'spend'
                                      ? row.spend || 0
                                      : graphMetric === 'clicks'
                                        ? row.clicks || 0
                                        : graphMetric === 'leads'
                                          ? row.leads || 0
                                          : row.ctr || 0,
                                }))}
                                margin={{ top: 8, right: 8, left: 24, bottom: 32 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="name"
                                  stroke="#64748b"
                                  fontSize={12}
                                  label={{ value: 'Breakdown', position: 'insideBottom', offset: -8, style: { fontSize: 12, fill: '#64748b' } }}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={12}
                                  label={{
                                    value: graphMetric === 'spend' ? 'Spend' : graphMetric === 'clicks' ? 'Clicks' : graphMetric === 'leads' ? 'Leads' : 'CTR (%)',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { fontSize: 12, fill: '#64748b' },
                                  }}
                                />
                                <Tooltip
                                  contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                  formatter={(value: number) =>
                                    graphMetric === 'spend'
                                      ? formatMoney(value, details.billing.currency)
                                      : graphMetric === 'ctr'
                                        ? `${Number(value).toFixed(2)}%`
                                        : formatNumber(value)
                                  }
                                />
                                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="campaign-table-wrap">
                          <table className="campaign-table">
                            <thead>
                              <tr>
                                  <th>Breakdown</th>
                                  <th>Leads</th>
                                  <th>Clicks</th>
                                  <th>Inline Link Clicks</th>
                                  <th>Unique Inline Link Clicks</th>
                                  <th>Impressions</th>
                                  <th>Reach</th>
                                  <th>Frequency</th>
                                  <th>CTR</th>
                                  <th>Cost / Inline Click</th>
                                  <th>CPC</th>
                                  <th>Spend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {breakdownRows.map((row) => (
                                <tr key={row.key}>
                                    <td>{row.key}</td>
                                    <td>{formatNumber(row.leads)}</td>
                                    <td>{formatNumber(row.clicks)}</td>
                                    <td>{formatNumber(row.inlineLinkClicks)}</td>
                                    <td>{formatNumber(row.uniqueInlineLinkClicks)}</td>
                                    <td>{formatNumber(row.impressions)}</td>
                                    <td>{formatNumber(row.reach)}</td>
                                    <td>{row.frequency == null ? '--' : row.frequency.toFixed(2)}</td>
                                    <td>{row.ctr == null ? '--' : `${row.ctr}%`}</td>
                                    <td>{formatMoney(row.costPerInlineLinkClick, details.billing.currency)}</td>
                                    <td>{formatMoney(row.cpc, details.billing.currency)}</td>
                                    <td>{formatMoney(row.spend, details.billing.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </section>
                </>
              )}

              {detailsTab === 'adsets' && (
                <section className="campaign-details-section">
                  <h3>Ad Sets</h3>
                  {details.adSets.length === 0 ? (
                    <p className="all-campaigns-desc">No ad set details available.</p>
                  ) : (
                    <div className="campaign-details-list">
                      {details.adSets.map((adSet) => (
                        <div key={adSet.id} className="campaign-details-card">
                          <div className="campaign-details-card-header">
                            <strong>{adSet.name}</strong>
                            <span className={`campaign-status ${adSet.status}`}>{adSet.status}</span>
                          </div>
                          <div className="campaign-details-grid">
                            <div><strong>Ad Set ID:</strong> {adSet.id}</div>
                            <div><strong>Bid strategy:</strong> {adSet.bidStrategy || '--'}</div>
                            <div><strong>Start:</strong> {formatDate(adSet.startTime)}</div>
                            <div><strong>End:</strong> {formatDate(adSet.endTime)}</div>
                            <div><strong>Daily budget:</strong> {formatMoney(adSet.dailyBudget, details.billing.currency)}</div>
                            <div><strong>Lifetime budget:</strong> {formatMoney(adSet.lifetimeBudget, details.billing.currency)}</div>
                            <div><strong>Leads:</strong> {formatNumber(adSet.metrics?.leads)}</div>
                            <div><strong>Clicks:</strong> {formatNumber(adSet.metrics?.clicks)}</div>
                            <div><strong>Impressions:</strong> {formatNumber(adSet.metrics?.impressions)}</div>
                            <div><strong>Reach:</strong> {formatNumber(adSet.metrics?.reach)}</div>
                            <div><strong>Frequency:</strong> {adSet.metrics?.frequency == null ? '--' : adSet.metrics.frequency.toFixed(2)}</div>
                            <div><strong>CTR:</strong> {adSet.metrics?.ctr == null ? '--' : `${adSet.metrics.ctr}%`}</div>
                            <div><strong>Inline link clicks:</strong> {formatNumber(adSet.metrics?.inlineLinkClicks)}</div>
                            <div><strong>Unique inline link clicks:</strong> {formatNumber(adSet.metrics?.uniqueInlineLinkClicks)}</div>
                            <div><strong>Cost / inline click:</strong> {formatMoney(adSet.metrics?.costPerInlineLinkClick, details.billing.currency)}</div>
                            <div><strong>Spend:</strong> {formatMoney(adSet.metrics?.spend, details.billing.currency)}</div>
                          </div>

                          <div className="ad-preview-grid">
                            {adSet.ads.length === 0 && <div className="ad-creative-empty">No ads found in this ad set.</div>}
                            {adSet.ads.map((ad) => (
                              <div key={ad.id} className="ad-preview-card">
                                <div className="ad-preview-media">
                                  <AdCreativePreview ad={ad} />
                                </div>
                                <div className="ad-preview-content">
                                  <div className="ad-preview-title">{ad.name}</div>
                                  <div className="ad-preview-meta">Status: {ad.status}</div>
                                  <div className="ad-preview-meta">Leads: {formatNumber(ad.metrics?.leads)}</div>
                                  <div className="ad-preview-meta">Clicks: {formatNumber(ad.metrics?.clicks)}</div>
                                  <div className="ad-preview-meta">Spend: {formatMoney(ad.metrics?.spend, details.billing.currency)}</div>
                                  {ad.creative?.permalinkUrl && (
                                    <a
                                      className="campaign-link-btn"
                                      href={ad.creative.permalinkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      View post
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

            </div>
          )}
        </div>

        {!detailsLoading && !detailsError && details && (
          <>
            <button
              type="button"
              className={`campaign-ai-fab ${assistantOpen ? 'campaign-ai-fab-close' : ''}`}
              onClick={() => setAssistantOpen((prev) => !prev)}
              title={assistantOpen ? 'Close' : 'AI Insights Assistant'}
            >
              {assistantOpen ? (
                <HiOutlineX size={24} />
              ) : (
                <>
                  <HiOutlineChip size={24} />
                  <span className="campaign-ai-fab-label">AI</span>
                </>
              )}
            </button>
            {assistantOpen && (
              <div className="campaign-ai-drawer-overlay" onClick={() => setAssistantOpen(false)} aria-hidden="true">
                <div
                  className="campaign-ai-drawer"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="campaign-ai-drawer-header">
                    <div className="campaign-ai-header-contact">
                      <div className="campaign-ai-avatar">AI</div>
                      <h4 className="campaign-ai-chat-name">Campaign AI</h4>
                    </div>
                    <button type="button" className="campaign-ai-exit-btn" onClick={() => setAssistantOpen(false)} aria-label="Exit chat">
                      <HiOutlineX size={20} />
                    </button>
                  </div>
                  <div className="campaign-ai-messages">
                    {assistantMessages.length === 0 && (
                      <div className="campaign-ai-msg bot campaign-ai-placeholder">
                        Ask for a summary, top segments, CTR, or optimization ideas.
                      </div>
                    )}
                    {assistantMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`campaign-ai-msg ${message.role}`}>
                        {message.text}
                      </div>
                    ))}
                  </div>
                  <form
                    className="campaign-ai-input-row"
                    onSubmit={(event) => {
                      event.preventDefault()
                      askAssistant(assistantInput)
                    }}
                  >
                    <input
                      value={assistantInput}
                      onChange={(event) => setAssistantInput(event.target.value)}
                      placeholder="Ask: Which segment has best CTR? Where should I increase budget?"
                    />
                    <button type="submit" className="campaign-ai-send-btn">Ask</button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="all-campaigns-page">
      <header className="all-campaigns-header">
        <div>
          {loading ? (
            <>
              <div className="skeleton all-campaigns-title-skeleton" />
              <div className="skeleton all-campaigns-desc-skeleton" />
              <div className="skeleton all-campaigns-status-skeleton" />
            </>
          ) : (
            <>
              <h1 className="all-campaigns-title">
                <HiOutlineSpeakerphone size={24} />
                All Campaigns
              </h1>
              <p className="all-campaigns-desc">
                Track your Facebook ad campaigns and other lead sources sending traffic to WhatsApp.
              </p>
              <p className="all-campaigns-desc">
                {connected ? 'Facebook connected' : 'Facebook not connected'}
                {lastSyncedAt ? ` | Last sync ${new Date(lastSyncedAt).toLocaleString()}` : ''}
              </p>
            </>
          )}
        </div>
        <div className="all-campaigns-actions">
          <button
            type="button"
            className="all-campaigns-add-btn"
            onClick={handleSync}
            disabled={syncing || loading}
          >
            {loading ? 'Sync now' : syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </header>

      {!loading && (
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
      )}

      {error && <div className="all-campaigns-empty">{error}</div>}

      {loading ? (
        <div className="all-campaigns-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="campaign-card campaign-card-skeleton">
              <div className="campaign-card-header">
                <div className="skeleton campaign-source-skeleton" />
                <div className="skeleton campaign-status-skeleton" />
              </div>
              <div className="skeleton campaign-name-skeleton" />
              <div className="campaign-stats">
                <div className="campaign-stat">
                  <span className="skeleton campaign-stat-value-skeleton" />
                  <span className="skeleton campaign-stat-label-skeleton" />
                </div>
                <div className="campaign-stat">
                  <span className="skeleton campaign-stat-value-skeleton" />
                  <span className="skeleton campaign-stat-label-skeleton" />
                </div>
                <div className="campaign-stat">
                  <span className="skeleton campaign-stat-value-skeleton" />
                  <span className="skeleton campaign-stat-label-skeleton" />
                </div>
              </div>
              <div className="campaign-footer">
                <span className="skeleton campaign-started-skeleton" />
                <span className="skeleton campaign-link-btn-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="all-campaigns-grid">
          {filteredCampaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              className="campaign-card campaign-card-btn"
              onClick={() => void openDetails(campaign.id)}
            >
              <div className="campaign-card-header">
                <div className="campaign-source">
                  <SiFacebook size={20} />
                  <span>{campaign.accountName || 'Facebook Ads'}</span>
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
                <span
                  role="button"
                  tabIndex={0}
                  className="campaign-link-btn"
                  title="View in Facebook"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (campaign.externalUrl) {
                      window.open(campaign.externalUrl, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      if (campaign.externalUrl) {
                        window.open(campaign.externalUrl, '_blank', 'noopener,noreferrer')
                      }
                    }
                  }}
                >
                  <HiOutlineExternalLink size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && filteredCampaigns.length === 0 && (
        <div className="all-campaigns-empty">
          <HiOutlineSpeakerphone size={48} className="empty-icon" />
          <p>No campaigns found</p>
          <span className="empty-hint">
            {filter === 'all' ? 'Run sync to get started' : `No ${filter} campaigns`}
          </span>
        </div>
      )}
    </div>
  )
}
