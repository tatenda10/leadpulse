import React from 'react'
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineDatabase,
  HiOutlineGlobeAlt,
  HiOutlineClock,
  HiOutlineMail,
} from 'react-icons/hi'
import './PrivacyPolicy.css'

const policySections = [
  {
    title: 'Information We Collect',
    text:
      'We collect the information needed to operate LeadPulse, including account details, business profile information, contact records, message content, campaign activity, device and browser data, usage logs, and support conversations.',
  },
  {
    title: 'How We Use Information',
    text:
      'We use personal and business data to provide the platform, manage conversations, automate workflows, generate analytics, improve reliability, secure accounts, troubleshoot issues, and communicate important service updates.',
  },
  {
    title: 'WhatsApp and Messaging Data',
    text:
      'When you connect messaging channels, we process message content, media metadata, sender details, timestamps, and delivery events so your team can view conversations, automate replies, score leads, and respond to customers.',
  },
  {
    title: 'Payments and Billing',
    text:
      'If billing applies, we may process invoicing records, payment references, and subscription information required to manage your account, verify transactions, and maintain financial records.',
  },
  {
    title: 'Cookies and Similar Technologies',
    text:
      'We may use cookies, local storage, and similar technologies to keep you signed in, remember preferences, improve performance, measure usage, and protect the service against abuse.',
  },
  {
    title: 'How We Share Data',
    text:
      'We do not sell personal data. We may share data with service providers, hosting partners, communication platforms, analytics tools, payment providers, or legal authorities when needed to deliver the service, comply with the law, or protect our rights and users.',
  },
  {
    title: 'Data Retention',
    text:
      'We keep information for as long as it is needed to provide the service, meet legal and accounting obligations, resolve disputes, enforce agreements, and maintain appropriate records for business operations.',
  },
  {
    title: 'Security Measures',
    text:
      'We use administrative, technical, and organizational safeguards designed to protect data against unauthorized access, alteration, disclosure, or destruction, but no system can guarantee absolute security.',
  },
  {
    title: 'Your Choices and Rights',
    text:
      'Depending on your location, you may have rights to access, correct, export, restrict, object to, or delete certain information. Account owners may also update business details and manage connected users within the platform.',
  },
  {
    title: 'International Processing',
    text:
      'Your information may be processed in countries other than the one where it was collected when our infrastructure, partners, or support operations require it. We take reasonable steps to protect data during those transfers.',
  },
  {
    title: 'Children’s Privacy',
    text:
      'LeadPulse is intended for business use and is not directed to children. If we learn that information was submitted in violation of applicable law, we will take appropriate steps to remove it.',
  },
  {
    title: 'Policy Updates',
    text:
      'We may update this Privacy Policy from time to time. When we make material changes, we may revise the effective date and provide notice through the platform or another appropriate channel.',
  },
]

const highlights = [
  {
    icon: HiOutlineShieldCheck,
    label: 'Purpose',
    value: 'Operate, secure, and improve LeadPulse',
  },
  {
    icon: HiOutlineDatabase,
    label: 'Core Data',
    value: 'Accounts, contacts, messages, campaigns, analytics',
  },
  {
    icon: HiOutlineLockClosed,
    label: 'Sharing Rule',
    value: 'No sale of personal data',
  },
  {
    icon: HiOutlineClock,
    label: 'Retention',
    value: 'Kept only as long as needed for service and compliance',
  },
]

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="privacy-policy-page">
      <header className="privacy-policy-hero">
        <div className="privacy-policy-copy">
          <span className="privacy-policy-kicker">LeadPulse Legal</span>
          <h1 className="privacy-policy-title">Privacy Policy</h1>
          <p className="privacy-policy-subtitle">
            This page explains how LeadPulse collects, uses, stores, shares, and protects
            information when you use the platform.
          </p>
        </div>
        <div className="privacy-policy-meta">
          <div className="privacy-policy-meta-card">
            <span className="privacy-policy-meta-label">Effective date</span>
            <strong>March 9, 2026</strong>
          </div>
          <div className="privacy-policy-meta-card">
            <span className="privacy-policy-meta-label">Applies to</span>
            <strong>LeadPulse web app and related services</strong>
          </div>
        </div>
      </header>

      <section className="privacy-policy-highlights" aria-label="Privacy highlights">
        {highlights.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="privacy-policy-highlight">
              <div className="privacy-policy-highlight-icon">
                <Icon size={20} />
              </div>
              <span className="privacy-policy-highlight-label">{item.label}</span>
              <p className="privacy-policy-highlight-value">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="privacy-policy-grid">
        <article className="privacy-policy-panel privacy-policy-panel-intro">
          <div className="privacy-policy-panel-header">
            <HiOutlineGlobeAlt size={20} />
            <h2>Overview</h2>
          </div>
          <p>
            LeadPulse is a business platform for managing leads, conversations, automation,
            analytics, campaigns, and customer communication workflows. Because the platform
            processes customer and business information, privacy and controlled access are part
            of the product’s operational requirements.
          </p>
          <p>
            By using LeadPulse, you agree that data may be processed in line with this policy
            and any applicable service terms, internal access controls, and lawful business
            requirements.
          </p>
        </article>

        <article className="privacy-policy-panel privacy-policy-panel-contact">
          <div className="privacy-policy-panel-header">
            <HiOutlineMail size={20} />
            <h2>Privacy Requests</h2>
          </div>
          <p>
            If you need help with privacy-related questions, data access, correction requests,
            or deletion requests, contact the account owner or the LeadPulse support team
            through the official support channel used for your deployment.
          </p>
          <p className="privacy-policy-note">
            This page is a product privacy policy draft and should be reviewed against your
            final legal and operational requirements before public release.
          </p>
        </article>
      </section>

      <section className="privacy-policy-sections">
        {policySections.map((section, index) => (
          <article key={section.title} className="privacy-policy-section-card">
            <div className="privacy-policy-section-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="privacy-policy-section-content">
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
