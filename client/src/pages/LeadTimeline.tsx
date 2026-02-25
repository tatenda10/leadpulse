import React, { useState } from 'react'
import { HiOutlineClock, HiOutlineChat, HiOutlineFire, HiOutlineUser } from 'react-icons/hi'
import './LeadTimeline.css'

type TimelineEvent = {
  id: string
  type: 'message' | 'score_change' | 'tag' | 'handover'
  time: string
  label: string
  detail?: string
}

const MOCK_LEAD = {
  name: 'John Mbanga',
  phone: '+263 77 123 4567',
  score: 87,
  status: 'hot',
}

const MOCK_EVENTS: TimelineEvent[] = [
  { id: '1', type: 'message', time: '10:32', label: 'First message', detail: 'Hi, I saw your ad on Facebook' },
  { id: '2', type: 'message', time: '10:34', label: 'Customer message', detail: 'What is your best price?' },
  { id: '3', type: 'score_change', time: '10:34', label: 'Score +15', detail: 'Keyword: price' },
  { id: '4', type: 'message', time: '10:35', label: 'Agent reply', detail: "Hi John, I'd be happy to help..." },
  { id: '5', type: 'handover', time: '10:35', label: 'Human takeover', detail: 'Bot → Agent' },
  { id: '6', type: 'tag', time: '10:40', label: 'Tag added', detail: 'high-intent' },
]

export const LeadTimeline: React.FC = () => {
  const [selectedLead] = useState(MOCK_LEAD)
  const [events] = useState<TimelineEvent[]>(MOCK_EVENTS)

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'message':
        return <HiOutlineChat size={16} />
      case 'score_change':
        return <HiOutlineFire size={16} />
      case 'tag':
        return <HiOutlineUser size={16} />
      case 'handover':
        return <HiOutlineUser size={16} />
      default:
        return <HiOutlineClock size={16} />
    }
  }

  return (
    <div className="lead-timeline-page">
      <header className="lead-timeline-header">
        <div>
          <h1 className="lead-timeline-title">
            <HiOutlineClock size={24} />
            Lead Timeline
          </h1>
          <p className="lead-timeline-desc">
            View the activity history and events for each lead.
          </p>
        </div>
      </header>

      <div className="lead-timeline-content">
        <aside className="lead-timeline-sidebar">
          <div className="lead-timeline-lead-card">
            <div className="lead-timeline-avatar">{selectedLead.name.charAt(0)}</div>
            <div className="lead-timeline-lead-info">
              <h3 className="lead-timeline-lead-name">{selectedLead.name}</h3>
              <span className="lead-timeline-lead-phone">{selectedLead.phone}</span>
              <span className={`lead-timeline-score ${selectedLead.status}`}>
                Score: {selectedLead.score}
              </span>
            </div>
          </div>
          <p className="lead-timeline-hint">Select a lead from the chat list to view their timeline.</p>
        </aside>

        <section className="lead-timeline-main">
          <div className="lead-timeline-events">
            {events.map((event, index) => (
              <div key={event.id} className="lead-timeline-event">
                <div className="lead-timeline-event-dot">
                  {getEventIcon(event.type)}
                </div>
                <div className="lead-timeline-event-content">
                  <div className="lead-timeline-event-header">
                    <span className="lead-timeline-event-time">{event.time}</span>
                    <span className="lead-timeline-event-label">{event.label}</span>
                  </div>
                  {event.detail && (
                    <p className="lead-timeline-event-detail">{event.detail}</p>
                  )}
                </div>
                {index < events.length - 1 && <div className="lead-timeline-connector" />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
