const { query } = require('../config/db');
const whatsappOutgoingService = require('../services/whatsappOutgoingService');

async function list(req, res) {
  try {
    const rows = await query(
      `SELECT c.id, c.contact_id, c.phone_number_id, c.status, c.lead_score, c.segment, c.source, c.last_message_at, c.created_at,
       ct.wa_id, ct.phone, ct.name AS contact_name,
       (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
       (SELECT direction FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_direction,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.direction = 'in' AND m.created_at > COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id AND direction = 'out'), '1970-01-01')) AS unread
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       ORDER BY c.last_message_at IS NULL, c.last_message_at DESC, c.id DESC
       LIMIT 200`
    );
    const conversations = rows.map((r) => ({
      id: String(r.id),
      contactId: r.contact_id,
      contact: r.contact_name || r.phone || r.wa_id,
      phone: r.phone || r.wa_id,
      lastMessage: r.last_message || '',
      lastMessageAt: r.last_message_at,
      unread: Number(r.unread || 0),
      status: r.status,
      leadScore: r.lead_score,
      segment: r.segment,
      source: r.source,
      isHot: (r.lead_score || 0) >= 70 || r.segment === 'hot_lead',
    }));
    res.json({ conversations });
  } catch (err) {
    console.error('Conversations list error:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
}

async function getMessages(req, res) {
  try {
    const conversationId = req.params.id;
    const rows = await query(
      'SELECT id, conversation_id, direction, type, body, sender, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    const messages = rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      direction: r.direction,
      type: r.type,
      body: r.body,
      sender: r.sender === 'contact' ? 'customer' : r.sender === 'business' ? 'bot' : 'agent',
      createdAt: r.created_at,
    }));
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

async function sendMessage(req, res) {
  try {
    const conversationId = req.params.id;
    const text = String(req.body?.body || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const rows = await query(
      `SELECT c.id, c.status, c.phone_number_id, ct.wa_id
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       WHERE c.id = ?
       LIMIT 1`,
      [conversationId]
    );

    const conversation = rows[0];
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status !== 'human') {
      return res.status(409).json({ error: 'Take over the conversation before sending as human' });
    }

    let outboundMetaId = null;
    try {
      outboundMetaId = await whatsappOutgoingService.sendText(
        conversation.phone_number_id,
        conversation.wa_id,
        text
      );
    } catch (err) {
      console.error('Manual send WhatsApp error:', err);
      return res.status(502).json({ error: err.message || 'Failed to send WhatsApp message' });
    }

    const insertResult = await query(
      'INSERT INTO messages (conversation_id, direction, type, body, meta_message_id, sender) VALUES (?, ?, ?, ?, ?, ?)',
      [conversationId, 'out', 'text', text, outboundMetaId, 'agent']
    );

    await query(
      'UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
      [conversationId]
    );

    const [inserted] = await query(
      'SELECT id, conversation_id, direction, type, body, sender, created_at FROM messages WHERE id = ?',
      [insertResult.insertId]
    );

    return res.status(201).json({
      message: {
        id: inserted.id,
        conversationId: inserted.conversation_id,
        direction: inserted.direction,
        type: inserted.type,
        body: inserted.body,
        sender: 'agent',
        createdAt: inserted.created_at,
      },
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

async function update(req, res) {
  try {
    const conversationId = req.params.id;
    const { segment, status } = req.body;
    const updates = [];
    const params = [];
    if (segment !== undefined) {
      updates.push('segment = ?');
      params.push(segment);
    }
    if (status !== undefined) {
      if (!['bot', 'human'].includes(status)) {
        return res.status(400).json({ error: 'status must be bot or human' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Provide segment and/or status' });
    }
    params.push(conversationId);
    await query(`UPDATE conversations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    const [row] = await query('SELECT id, status, segment, lead_score FROM conversations WHERE id = ?', [conversationId]);
    if (!row) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: row });
  } catch (err) {
    console.error('Update conversation error:', err);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
}

module.exports = { list, getMessages, sendMessage, update };
