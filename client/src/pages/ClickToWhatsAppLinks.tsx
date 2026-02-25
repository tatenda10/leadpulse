import React, { useState } from 'react'
import { SiWhatsapp } from 'react-icons/si'
import { HiOutlinePlus, HiOutlineClipboard } from 'react-icons/hi'
import './ClickToWhatsAppLinks.css'

type WhatsAppLink = {
  id: string
  name: string
  phone: string
  prefillMessage: string
  clicks: number
  conversations: number
}

const MOCK_LINKS: WhatsAppLink[] = [
  { id: '1', name: 'Main support', phone: '+263771234567', prefillMessage: 'Hi, I need help with my order', clicks: 245, conversations: 89 },
  { id: '2', name: 'Sales enquiry', phone: '+263771234567', prefillMessage: 'Hi, I\'m interested in your products', clicks: 156, conversations: 42 },
  { id: '3', name: 'Catalogue request', phone: '+263771234567', prefillMessage: 'Please send me the catalogue', clicks: 98, conversations: 31 },
]

export const ClickToWhatsAppLinks: React.FC = () => {
  const [links] = useState<WhatsAppLink[]>(MOCK_LINKS)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const buildLink = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const encoded = encodeURIComponent(message || 'Hi')
    return `https://wa.me/${cleanPhone}?text=${encoded}`
  }

  const copyLink = (link: WhatsAppLink) => {
    const url = buildLink(link.phone, link.prefillMessage)
    navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="click-to-whatsapp-page">
      <header className="click-to-whatsapp-header">
        <div>
          <h1 className="click-to-whatsapp-title">
            <SiWhatsapp size={24} />
            Click-to-WhatsApp Links
          </h1>
          <p className="click-to-whatsapp-desc">
            Create shareable WhatsApp links with pre-filled messages for ads, websites, and social.
          </p>
        </div>
        <button type="button" className="click-to-whatsapp-add-btn">
          <HiOutlinePlus size={18} />
          Create link
        </button>
      </header>

      <div className="click-to-whatsapp-list">
        {links.map((link) => (
          <div key={link.id} className="whatsapp-link-card">
            <div className="whatsapp-link-header">
              <h3 className="whatsapp-link-name">{link.name}</h3>
              <button
                type="button"
                className="whatsapp-link-copy-btn"
                onClick={() => copyLink(link)}
                title="Copy link"
              >
                <HiOutlineClipboard size={18} />
                {copiedId === link.id ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="whatsapp-link-url">
              {buildLink(link.phone, link.prefillMessage)}
            </div>
            <div className="whatsapp-link-prefill">
              <span className="prefill-label">Prefill:</span> {link.prefillMessage}
            </div>
            <div className="whatsapp-link-stats">
              <div className="stat">
                <span className="stat-value">{link.clicks}</span>
                <span className="stat-label">Clicks</span>
              </div>
              <div className="stat">
                <span className="stat-value">{link.conversations}</span>
                <span className="stat-label">Conversations</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
