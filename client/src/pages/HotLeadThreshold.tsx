import React, { useState } from 'react'
import { HiOutlineLightningBolt, HiOutlineFire } from 'react-icons/hi'
import './HotLeadThreshold.css'

export const HotLeadThreshold: React.FC = () => {
  const [hotThreshold, setHotThreshold] = useState(70)
  const [warmThreshold, setWarmThreshold] = useState(40)
  const [saved, setSaved] = useState(true)

  const handleHotChange = (value: number) => {
    setHotThreshold(Math.max(0, Math.min(100, value)))
    setSaved(false)
  }

  const handleWarmChange = (value: number) => {
    setWarmThreshold(Math.max(0, Math.min(100, value)))
    setSaved(false)
  }

  const handleSave = () => {
    if (warmThreshold >= hotThreshold) {
      setWarmThreshold(hotThreshold - 1)
    }
    setSaved(true)
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

      <div className="hot-lead-threshold-content">
        <div className="threshold-card">
          <div className="threshold-visual">
            <div className="threshold-bar">
              <div
                className="threshold-segment cold"
                style={{ width: `${warmThreshold}%` }}
              />
              <div
                className="threshold-segment warm"
                style={{
                  width: `${hotThreshold - warmThreshold}%`,
                  left: `${warmThreshold}%`,
                }}
              />
              <div
                className="threshold-segment hot"
                style={{
                  width: `${100 - hotThreshold}%`,
                  left: `${hotThreshold}%`,
                }}
              />
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
              <input
                type="number"
                min={0}
                max={100}
                value={warmThreshold}
                onChange={(e) => handleWarmChange(parseInt(e.target.value, 10) || 0)}
              />
              <span className="field-hint">Leads with score ≥ {warmThreshold} and &lt; {hotThreshold}</span>
            </div>
            <div className="threshold-field">
              <label>
                <span className="threshold-dot hot" />
                Hot lead (min score)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={hotThreshold}
                onChange={(e) => handleHotChange(parseInt(e.target.value, 10) || 0)}
              />
              <span className="field-hint">Leads with score ≥ {hotThreshold} are flagged as hot</span>
            </div>
          </div>

          <button
            type="button"
            className="threshold-save-btn"
            onClick={handleSave}
            disabled={saved || !isValid}
          >
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>

        <div className="threshold-preview-card">
          <h3 className="preview-title">How it works</h3>
          <div className="preview-tiers">
            <div className="preview-tier cold">
              <span className="tier-label">Cold</span>
              <span className="tier-range">
                {warmThreshold > 0 ? `0 – ${warmThreshold - 1}` : '—'}
              </span>
            </div>
            <div className="preview-tier warm">
              <span className="tier-label">Warm</span>
              <span className="tier-range">{warmThreshold} – {hotThreshold - 1}</span>
            </div>
            <div className="preview-tier hot">
              <HiOutlineFire size={16} />
              <span className="tier-label">Hot</span>
              <span className="tier-range">{hotThreshold}+</span>
            </div>
          </div>
          <p className="preview-hint">
            Hot leads appear in the Hot Leads inbox and can trigger notifications for faster follow-up.
          </p>
        </div>
      </div>
    </div>
  )
}
