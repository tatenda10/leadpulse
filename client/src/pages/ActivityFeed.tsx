import React from 'react'
import {
  HiOutlineChat,
  HiOutlineFire,
  HiOutlineChip,
  HiOutlineUser,
  HiOutlineArrowRight,
} from 'react-icons/hi'
import './ActivityFeed.css'

const ACTIVITIES = [
  { id: 1, type: 'new_chat', contact: '+263 77 123 4567', time: '2 min ago', meta: 'First message', icon: HiOutlineChat, color: '#7c3aed' },
  { id: 2, type: 'hot_lead', contact: 'John Mbanga', time: '5 min ago', meta: 'Score: 92', icon: HiOutlineFire, color: '#ef4444' },
  { id: 3, type: 'bot_reply', contact: '+263 71 987 6543', time: '8 min ago', meta: 'Auto-replied', icon: HiOutlineChip, color: '#6366f1' },
  { id: 4, type: 'takeover', contact: 'Sarah Ncube', time: '12 min ago', meta: 'Agent took over', icon: HiOutlineUser, color: '#22c55e' },
  { id: 5, type: 'new_chat', contact: '+263 78 555 1234', time: '15 min ago', meta: 'From Facebook', icon: HiOutlineChat, color: '#7c3aed' },
  { id: 6, type: 'hot_lead', contact: 'Mike Dube', time: '18 min ago', meta: 'Score: 88', icon: HiOutlineFire, color: '#ef4444' },
  { id: 7, type: 'bot_reply', contact: '+263 77 111 2222', time: '22 min ago', meta: 'Auto-replied', icon: HiOutlineChip, color: '#6366f1' },
  { id: 8, type: 'new_chat', contact: 'Grace Mutasa', time: '28 min ago', meta: 'Click-to-WhatsApp', icon: HiOutlineChat, color: '#7c3aed' },
]

const TYPE_LABELS: Record<string, string> = {
  new_chat: 'New conversation',
  hot_lead: 'Hot lead detected',
  bot_reply: 'Bot replied',
  takeover: 'Human takeover',
}

export const ActivityFeed: React.FC = () => {
  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h2 className="activity-feed-title">Recent activity</h2>
      </div>
      <div className="activity-list">
        {ACTIVITIES.map((activity) => {
          const Icon = activity.icon
          return (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon-wrap" style={{ backgroundColor: `${activity.color}20`, color: activity.color }}>
                <Icon size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-type">{TYPE_LABELS[activity.type]}</div>
                <div className="activity-contact">{activity.contact}</div>
                <div className="activity-meta">{activity.meta}</div>
              </div>
              <div className="activity-time">{activity.time}</div>
              <HiOutlineArrowRight size={16} className="activity-arrow" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
