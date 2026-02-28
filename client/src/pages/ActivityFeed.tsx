import React, { useEffect, useState } from 'react'
import {
  HiOutlineChat,
  HiOutlineFire,
  HiOutlineChip,
  HiOutlineUser,
  HiOutlineArrowRight,
} from 'react-icons/hi'
import { apiRequest } from '../contexts/Api'
import { useAuth } from '../contexts/AuthContext'
import './ActivityFeed.css'

type Activity = {
  id: string
  type: 'new_chat' | 'hot_lead' | 'bot_reply' | 'takeover'
  contact: string
  time: string
  meta: string
}

type ActivityResponse = {
  activities: Activity[]
}

const TYPE_CONFIG: Record<Activity['type'], { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  new_chat: { label: 'New conversation', icon: HiOutlineChat, color: '#7c3aed' },
  hot_lead: { label: 'Hot lead detected', icon: HiOutlineFire, color: '#ef4444' },
  bot_reply: { label: 'Bot replied', icon: HiOutlineChip, color: '#6366f1' },
  takeover: { label: 'Human takeover', icon: HiOutlineUser, color: '#22c55e' },
}

export const ActivityFeed: React.FC = () => {
  const { token } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await apiRequest<ActivityResponse>('/analytics/activity', { token })
        if (!cancelled) setActivities(response.activities || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity feed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading)
    return (
      <div className="activity-feed">
        <div className="activity-feed-header">
          <div className="skeleton activity-title-skeleton" />
        </div>
        <div className="activity-list">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="activity-item activity-item-skeleton">
              <div className="activity-icon-wrap skeleton activity-icon-skeleton" />
              <div className="activity-content">
                <div className="skeleton activity-line-skeleton" />
                <div className="skeleton activity-line-skeleton short" />
              </div>
              <div className="skeleton activity-time-skeleton" />
            </div>
          ))}
        </div>
      </div>
    )
  if (error) return <div className="activity-feed"><div className="activity-item">{error}</div></div>

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h2 className="activity-feed-title">Recent activity</h2>
      </div>
      <div className="activity-list">
        {activities.map((activity) => {
          const cfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.new_chat
          const Icon = cfg.icon
          return (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon-wrap" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                <Icon size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-type">{cfg.label}</div>
                <div className="activity-contact">{activity.contact}</div>
                <div className="activity-meta">{activity.meta}</div>
              </div>
              <div className="activity-time">{activity.time}</div>
              <HiOutlineArrowRight size={16} className="activity-arrow" />
            </div>
          )
        })}
        {activities.length === 0 && <div className="activity-item">No recent activity</div>}
      </div>
    </div>
  )
}

