-- LeadPulse: users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);

-- WhatsApp: one row per WhatsApp user (wa_id from Meta)
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wa_id VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(50) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wa_id (wa_id)
);

-- One per contact per channel (single number = one per contact)
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  phone_number_id VARCHAR(50) NOT NULL,
  waba_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'bot',
  lead_score INT DEFAULT NULL,
  segment VARCHAR(50) DEFAULT NULL,
  source VARCHAR(50) DEFAULT 'organic',
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_id (contact_id),
  INDEX idx_last_message_at (last_message_at),
  INDEX idx_segment (segment),
  INDEX idx_lead_score (lead_score),
  INDEX idx_status (status),
  UNIQUE KEY uq_conversation_contact_phone (contact_id, phone_number_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Every in/out message
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  direction VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  body TEXT,
  meta_message_id VARCHAR(100) DEFAULT NULL,
  sender VARCHAR(20) NOT NULL DEFAULT 'contact',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation_created (conversation_id, created_at),
  UNIQUE KEY uq_meta_message_id (meta_message_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Optional: scoring rules for chatbot (keyword, response_speed, etc.)
CREATE TABLE IF NOT EXISTS scoring_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  condition_type VARCHAR(50) NOT NULL,
  value VARCHAR(255) DEFAULT NULL,
  points INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled)
);

-- Hot/warm lead thresholds (single config row)
CREATE TABLE IF NOT EXISTS lead_scoring_config (
  id TINYINT PRIMARY KEY,
  warm_threshold INT NOT NULL DEFAULT 40,
  hot_threshold INT NOT NULL DEFAULT 70,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO lead_scoring_config (id, warm_threshold, hot_threshold)
VALUES (1, 40, 70);

-- Keyword weights used by lead scoring
CREATE TABLE IF NOT EXISTS keyword_weights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL UNIQUE,
  weight INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lead tags config
CREATE TABLE IF NOT EXISTS lead_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Auto reply rules
CREATE TABLE IF NOT EXISTS auto_reply_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trigger_text VARCHAR(500) NOT NULL,
  reply_text TEXT NOT NULL,
  match_type VARCHAR(20) NOT NULL DEFAULT 'contains',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled)
);

-- Keyword triggers for bot actions
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keywords VARCHAR(500) NOT NULL,
  action VARCHAR(20) NOT NULL,
  value_text TEXT DEFAULT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled)
);

-- Welcome/fallback bot messages (single config row)
CREATE TABLE IF NOT EXISTS bot_message_settings (
  id TINYINT PRIMARY KEY,
  welcome_enabled TINYINT(1) NOT NULL DEFAULT 1,
  welcome_message TEXT NOT NULL,
  fallback_enabled TINYINT(1) NOT NULL DEFAULT 1,
  fallback_message TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO bot_message_settings (
  id,
  welcome_enabled,
  welcome_message,
  fallback_enabled,
  fallback_message
) VALUES (
  1,
  1,
  'Hello! Thanks for reaching out. I''m your assistant and I''m here to help. How can I assist you today?',
  1,
  'I''m sorry, I didn''t quite understand that. Could you please rephrase or type ''help'' to see our options?'
);

-- Global bot runtime status and away settings (single config row)
CREATE TABLE IF NOT EXISTS bot_status_settings (
  id TINYINT PRIMARY KEY,
  bot_enabled TINYINT(1) NOT NULL DEFAULT 1,
  away_enabled TINYINT(1) NOT NULL DEFAULT 0,
  away_message TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO bot_status_settings (id, bot_enabled, away_enabled, away_message)
VALUES (
  1,
  1,
  0,
  'Our team is currently away. We''ll respond as soon as possible. For urgent matters, please leave your contact details.'
);

-- Optional display names set by users (so incoming profile updates do not overwrite)
CREATE TABLE IF NOT EXISTS contact_profiles (
  contact_id INT PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Internal notes on contacts
CREATE TABLE IF NOT EXISTS contact_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  note_text TEXT NOT NULL,
  author VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_created (contact_id, created_at),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Contact segments configuration
CREATE TABLE IF NOT EXISTS contact_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  criteria_type VARCHAR(50) NOT NULL,
  criteria_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact tags configuration
CREATE TABLE IF NOT EXISTS contact_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact-to-tag assignments
CREATE TABLE IF NOT EXISTS contact_tag_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contact_tag (contact_id, tag_id),
  INDEX idx_tag (tag_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES contact_tags(id) ON DELETE CASCADE
);

-- Facebook integration connection (single workspace-level row)
CREATE TABLE IF NOT EXISTS facebook_connections (
  id TINYINT PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_label VARCHAR(100) DEFAULT 'manual',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Connected Facebook ad accounts
CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(255) DEFAULT NULL,
  currency VARCHAR(10) DEFAULT NULL,
  is_selected TINYINT(1) NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cached campaigns synced from Facebook Ads API
CREATE TABLE IF NOT EXISTS facebook_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id VARCHAR(50) NOT NULL UNIQUE,
  account_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  objective VARCHAR(100) DEFAULT NULL,
  clicks INT NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  conv_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  started_at DATE DEFAULT NULL,
  last_source_update_at DATETIME DEFAULT NULL,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_status (account_id, status),
  INDEX idx_started (started_at)
);

-- Analytics event stream for dashboard activity feed
CREATE TABLE IF NOT EXISTS analytics_activity_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  conversation_id INT DEFAULT NULL,
  contact_id INT DEFAULT NULL,
  title VARCHAR(255) DEFAULT NULL,
  meta_text VARCHAR(255) DEFAULT NULL,
  payload_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_time (created_at),
  INDEX idx_event_type (event_type),
  INDEX idx_conversation (conversation_id),
  INDEX idx_contact (contact_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- Daily analytics snapshot cache (optional pre-aggregated dashboard metrics)
CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  metric_date DATE PRIMARY KEY,
  total_conversations INT NOT NULL DEFAULT 0,
  new_conversations INT NOT NULL DEFAULT 0,
  hot_leads INT NOT NULL DEFAULT 0,
  bot_handled INT NOT NULL DEFAULT 0,
  human_handled INT NOT NULL DEFAULT 0,
  incoming_messages INT NOT NULL DEFAULT 0,
  outgoing_messages INT NOT NULL DEFAULT 0,
  avg_response_seconds DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
