const { query } = require('../config/db');
const whatsappOutgoingService = require('./whatsappOutgoingService');
const chatbotService = require('./chatbotService');

async function handleIncoming(value) {
  try {
    const messages = value.messages || [];
    const contacts = value.contacts || [];
    const metadata = value.metadata || {};
    const phoneNumberId = metadata.phone_number_id;
    console.log('[Incoming] Processing value: messages=', messages.length, 'phone_number_id=', phoneNumberId);

    const [botStatusRow] = await query(
      'SELECT bot_enabled, away_enabled, away_message FROM bot_status_settings WHERE id = 1'
    );
    const globalBotEnabled = botStatusRow ? Boolean(botStatusRow.bot_enabled) : true;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgType = msg.type || 'text';
      if (msgType !== 'text' || !msg.text || !msg.text.body) {
        console.log('[Incoming] Skip non-text message type=', msgType);
        continue;
      }
      console.log('[Incoming] Text from', msg.from, ':', msg.text.body.slice(0, 50));

      const fromWaId = String(msg.from);
      const metaMessageId = msg.id;
      const textBody = msg.text.body;
      const contactInfo = contacts.find((c) => String(c.wa_id) === fromWaId) || {};
      const profileName = contactInfo.profile?.name || null;

      let contactId;
      const existingContact = await query('SELECT id FROM contacts WHERE wa_id = ?', [fromWaId]);
      if (existingContact.length > 0) {
        contactId = existingContact[0].id;
        if (profileName) {
          await query('UPDATE contacts SET name = ?, updated_at = NOW() WHERE id = ?', [profileName, contactId]);
        }
      } else {
        const insertContact = await query(
          'INSERT INTO contacts (wa_id, phone, name) VALUES (?, ?, ?)',
          [fromWaId, fromWaId, profileName]
        );
        contactId = insertContact.insertId;
      }

      const wabaId = metadata.phone_number_id || '';
      let convRows = await query(
        'SELECT id, status FROM conversations WHERE contact_id = ? AND phone_number_id = ?',
        [contactId, phoneNumberId]
      );
      let conversationId;
      let conversationStatus;
      if (convRows.length > 0) {
        conversationId = convRows[0].id;
        conversationStatus = convRows[0].status;
      } else {
        const insertConv = await query(
          'INSERT INTO conversations (contact_id, phone_number_id, waba_id, status, source) VALUES (?, ?, ?, ?, ?)',
          [contactId, phoneNumberId, wabaId, 'bot', 'organic']
        );
        conversationId = insertConv.insertId;
        conversationStatus = 'bot';
      }

      const existingMsg = await query('SELECT id FROM messages WHERE meta_message_id = ?', [metaMessageId]);
      if (existingMsg.length > 0) {
        continue;
      }

      await query(
        'INSERT INTO messages (conversation_id, direction, type, body, meta_message_id, sender) VALUES (?, ?, ?, ?, ?, ?)',
        [conversationId, 'in', 'text', textBody, metaMessageId, 'contact']
      );
      await query(
        'UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
        [conversationId]
      );

      if (!globalBotEnabled) {
        console.log('[Incoming] Global bot is disabled. Skipping bot reply.');
        continue;
      }

      if (conversationStatus !== 'bot') {
        console.log('[Incoming] Conversation', conversationId, 'is in human mode. Skipping bot reply.');
        continue;
      }

      const recentMessages = await query(
        'SELECT direction, body, sender, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10',
        [conversationId]
      );
      const context = recentMessages.reverse().map((m) => ({ role: m.sender, text: m.body }));

      const { replyText, leadScore, segment } = await chatbotService.getReplyAndClassify(
        conversationId,
        textBody,
        context
      );

      await query(
        'UPDATE conversations SET lead_score = ?, segment = ?, updated_at = NOW() WHERE id = ?',
        [leadScore, segment, conversationId]
      );

      let outboundMetaId = null;
      try {
        outboundMetaId = await whatsappOutgoingService.sendText(phoneNumberId, fromWaId, replyText);
        console.log('[Incoming] Reply sent to', fromWaId);
      } catch (err) {
        console.error('[Incoming] WhatsApp send error:', err);
      }

      await query(
        'INSERT INTO messages (conversation_id, direction, type, body, meta_message_id, sender) VALUES (?, ?, ?, ?, ?, ?)',
        [conversationId, 'out', 'text', replyText, outboundMetaId, 'business']
      );
    }
  } catch (err) {
    console.error('[Incoming] Error:', err);
    throw err;
  }
}

module.exports = { handleIncoming };
