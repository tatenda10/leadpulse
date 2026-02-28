import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HiOutlineLightningBolt, HiOutlineFire, HiOutlineX } from 'react-icons/hi'
import './HotLeadThreshold.css'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'

type ThresholdResponse = {
  warmThreshold: number
  hotThreshold: number
}

export const HotLeadThreshold: React.FC = () => {
  const { token } = useAuth()
  const [hotThreshold, setHotThreshold] = useState(70)
  const [warmThreshold, setWarmThreshold] = useState(40)
  const [saved, setSaved] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadThreshold() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<ThresholdResponse>('/settings/hot-lead-threshold', { token })
        if (cancelled) return
        setWarmThreshold(response.warmThreshold)
        setHotThreshold(response.hotThreshold)
        setSaved(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load thresholds')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadThreshold()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleHotChange = (value: number) => {
    setHotThreshold(Math.max(0, Math.min(100, value)))
    setSaved(false)
  }

  const handleWarmChange = (value: number) => {
    setWarmThreshold(Math.max(0, Math.min(100, value)))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!token) return
    if (!isValid) return
    try {
      const response = await apiRequest<ThresholdResponse>('/settings/hot-lead-threshold', {
        method: 'PUT',
        body: { warmThreshold, hotThreshold },
        token,
      })
      setWarmThreshold(response.warmThreshold)
      setHotThreshold(response.hotThreshold)
      setSaved(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save thresholds')
      setToast({ message: e instanceof Error ? e.message : 'Failed to save thresholds', type: 'error' })
      return
    }
    setToast({ message: 'Thresholds updated', type: 'success' })
  }

  const isValid = warmThreshold < hotThreshold

  return (
    <div className="hot-lead-threshold-page">
      <header className="hot-lead-threshold-header">
        <div>
          <h1 className="hot-lead-threshold-title">
            <HiOutlineLightningBolt size={24} />
            Hot Lead Threshold
          </h1>
          <p className="hot-lead-threshold-desc">
            Set the score thresholds that define cold, warm, and hot leads.
          </p>
        </div>
      </header>

      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {toast && (
        <ThresholdToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <div className="threshold-card"><p>Loading thresholds...</p></div>
      ) : (
      <div className="hot-lead-threshold-content">
        <div className="threshold-card">
          <div className="threshold-visual">
            <div className="threshold-bar">
              <div className="threshold-segment cold" style={{ width: `${warmThreshold}%` }} />
              <div className="threshold-segment warm" style={{ width: `${hotThreshold - warmThreshold}%`, left: `${warmThreshold}%` }} />
              <div className="threshold-segment hot" style={{ width: `${100 - hotThreshold}%`, left: `${hotThreshold}%` }} />
            </div>
            <div className="threshold-labels">
              <span>0</span>
              <span className="warm-label">{warmThreshold}</span>
              <span className="hot-label">{hotThreshold}</span>
              <span>100</span>
            </div>
          </div>

          <div className="threshold-fields">
            <div className="threshold-field">
              <label>
                <span className="threshold-dot warm" />
                Warm lead (min score)
              </label>
              <input type="number" min={0} max={100} value={warmThreshold} onChange={(e) => handleWarmChange(parseInt(e.target.value, 10) || 0)} />
              <span className="field-hint">Leads with score &gt;= {warmThreshold} and &lt; {hotThreshold}</span>
            </div>
            <div className="threshold-field">
              <label>
                <span className="threshold-dot hot" />
                Hot lead (min score)
              </label>
              <input type="number" min={0} max={100} value={hotThreshold} onChange={(e) => handleHotChange(parseInt(e.target.value, 10) || 0)} />
              <span className="field-hint">Leads with score &gt;= {hotThreshold} are flagged as hot</span>
            </div>
          </div>

          <button type="button" className="threshold-save-btn" onClick={() => void handleSave()} disabled={saved || !isValid}>
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>

        <div className="threshold-preview-card">
          <h3 className="preview-title">How it works</h3>
          <div className="preview-tiers">
            <div className="preview-tier cold">
              <span className="tier-label">Cold</span>
              <span className="tier-range">{warmThreshold > 0 ? `0 - ${warmThreshold - 1}` : '-'}</span>
            </div>
            <div className="preview-tier warm">
              <span className="tier-label">Warm</span>
              <span className="tier-range">{warmThreshold} - {hotThreshold - 1}</span>
            </div>
            <div className="preview-tier hot">
              <HiOutlineFire size={16} />
              <span className="tier-label">Hot</span>
              <span className="tier-range">{hotThreshold}+</span>
            </div>
          </div>
          <p className="preview-hint">Hot leads appear in the Hot Leads inbox and can trigger notifications for faster follow-up.</p>
        </div>
      </div>
      )}
    </div>
  )
}

type ThresholdToastProps = {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

const ThresholdToast: React.FC<ThresholdToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className={`threshold-toast threshold-toast-${type}`} role="status">
      <span className="threshold-toast-message">{message}</span>
      <button type="button" className="threshold-toast-close" onClick={onClose} aria-label="Close">
        <HiOutlineX size={18} />
      </button>
    </div>,
    document.body
  )
}
