const { query } = require('../config/db');
const chatbotPrompt = require('../config/chatbotPrompt');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.trim() : '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const DEFAULT_REPLY = "Thanks for your message. We'll get back to you shortly.";
const SEGMENT_HOT = 'hot_lead';
const SEGMENT_QUALIFIED = 'qualified';
const SEGMENT_COLD = 'cold';

function sanitizeReply(text) {
  return String(text || '')
    .replace(/^(that'?s a great question[,!.\s]*|great question[,!.\s]*|good question[,!.\s]*)/i, '')
    .replace(/\*/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getConversationText(conversationContext, messageText) {
  return [...(conversationContext || []).map((msg) => String(msg.text || '')), String(messageText || '')]
    .join(' ')
    .trim();
}

function extractStudentCount(text) {
  const valuePatterns = [
    /\b(?:have|with|for|around|about|say|roughly)?\s*(\d{1,5})\s+students?\b/i,
    /\bstudents?\s*(?:are|is|=|:)?\s*(\d{1,5})\b/i,
    /\b(\d{1,5})\b/,
  ];

  for (const pattern of valuePatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const count = parseInt(match[1], 10);
    if (!Number.isNaN(count) && count > 0) return count;
  }
  return null;
}

function extractSchoolName(text) {
  const patterns = [
    /\b(?:school name is|school is called|school is|from)\s+([A-Za-z0-9 .,&'-]{2,80})/i,
    /\b([A-Za-z0-9 .,&'-]{2,80}\s+school)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const name = String(match[1] || '').trim().replace(/[.?!,;:]+$/, '');
    if (name) return name;
  }
  return null;
}

function getPricingReply(studentCount, schoolName) {
  if (studentCount <= 300) {
    return schoolName
      ? `${schoolName}'s pricing is $400 implementation and $50 per term.`
      : `The pricing is $400 implementation and $50 per term.`;
  }
  if (studentCount <= 500) {
    return schoolName
      ? `${schoolName}'s pricing is $600 implementation and $50 per term.`
      : `The pricing is $600 implementation and $50 per term.`;
  }
  return schoolName
    ? `${schoolName}'s pricing is $1200 implementation and $50 per month for hosting and maintenance.`
    : `The pricing is $1200 implementation and $50 per month for hosting and maintenance.`;
}

async function getReplyFromClaude(messageText, conversationContext) {
  if (!CLAUDE_API_KEY) return null;

  const messages = [];
  for (const msg of conversationContext || []) {
    const role = msg.role === 'business' || msg.role === 'agent' ? 'assistant' : 'user';
    messages.push({ role, content: String(msg.text || '').slice(0, 2000) });
  }
  messages.push({ role: 'user', content: messageText.slice(0, 4000) });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: chatbotPrompt,
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Claude API error:', data.error || res.statusText);
    return null;
  }

  const text = data.content?.[0]?.text;
  return typeof text === 'string' ? text.trim() : null;
}

function getReplyFromRules(messageText, conversationContext) {
  const lower = (messageText || '').toLowerCase();
  const conversationText = getConversationText(conversationContext, messageText);
  const studentCount = extractStudentCount(conversationText);
  const schoolName = extractSchoolName(conversationText);

  if (/\b(price|cost|how much|pricing|fees?)\b/.test(lower)) {
    if (studentCount && schoolName) {
      return getPricingReply(studentCount, schoolName);
    }
    if (studentCount) {
      return "What is your school name?";
    }
    if (schoolName) {
      return "How many students do you have?";
    }
    return "What is your school name and how many students do you have?";
  }
  if (/\b(what exactly does a school management system do|what does a school management system do|explain.*school management system)\b/.test(lower)) {
    return "A school management system helps a school manage admissions, student records, attendance, fees, exams, timetables, staff, parent communication, and reports in one place.";
  }
  if (/\b(what do you do|what do you sell|school management|software|more info|information|what is the system about)\b/.test(lower)) {
    return "Our school management system helps schools manage admissions, student records, attendance, fees, exams, timetables, communication, reporting, and daily administration in one place.";
  }
  if (/\b(paynow|online payment|online payments|payment integration|ecocash|zimswitch|bank payment|bank payments)\b/.test(lower)) {
    return "We use Paynow integration, and it supports payments through EcoCash, Zimswitch, and other banks as well.";
  }
  if (/\b(demo|meeting|presentation)\b/.test(lower)) {
    return "Yes, we can schedule a demo based on your availability, either online or in person. What day and time works for you?";
  }
  if (/\b(where are you|location|address)\b/.test(lower)) {
    return "We are at 11 Peebles Eastlea Road, Harare, and we serve schools nationwide.";
  }
  if (/\b(offline|internet|without internet)\b/.test(lower)) {
    return "We do offer an offline version, but it is limited to the administrative part only.";
  }
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(lower)) {
    return "Hi, good morning. How can I help you regarding our School Management System?";
  }
  return "Hi, this has been our customer support chatbot. I am transferring you to a human on call.";
}

async function computeScoreFromRules(conversationId, messageText) {
  const rules = await query('SELECT condition_type, value, points FROM scoring_rules WHERE enabled = 1');
  let total = 0;
  const historyRows = await query(
    'SELECT body, direction FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );

  const fullConversationText = historyRows
    .map((row) => String(row.body || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const latestIncomingLower = (messageText || '').toLowerCase();
  const lower = `${fullConversationText} ${latestIncomingLower}`.trim();

  for (const rule of rules) {
    if (rule.condition_type === 'keyword' && rule.value) {
      const keywords = rule.value.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
      if (keywords.some((k) => lower.includes(k))) total += rule.points;
    }
    if (rule.condition_type === 'asked_callback') {
      if (/\b(callback|call back|ring me|contact me)\b/.test(lower)) total += rule.points;
    }
  }

  const count = historyRows.reduce((acc, row) => acc + (row.direction === 'in' ? 1 : 0), 0);
  for (const rule of rules) {
    if (rule.condition_type === 'message_count' && rule.value) {
      const threshold = parseInt(rule.value, 10);
      if (!isNaN(threshold) && count >= threshold) total += rule.points;
    }
  }

  if (/\b(price|pricing|how much|fees?|cost|quote)\b/.test(lower)) total += 15;
  if (/\b(school|students?|teachers?|admin)\b/.test(lower)) total += 10;

  return Math.min(100, Math.max(0, total));
}

function scoreToSegment(score) {
  if (score >= 70) return SEGMENT_HOT;
  if (score >= 40) return SEGMENT_QUALIFIED;
  return SEGMENT_COLD;
}

async function getReplyAndClassify(conversationId, messageText, conversationContext) {
  const leadScore = await computeScoreFromRules(conversationId, messageText);
  const segment = scoreToSegment(leadScore);

  let replyText = await getReplyFromClaude(messageText, conversationContext);
  if (!replyText) {
    replyText = getReplyFromRules(messageText, conversationContext);
  }
  replyText = sanitizeReply(replyText);

  return { replyText, leadScore, segment };
}

module.exports = { getReplyAndClassify };
