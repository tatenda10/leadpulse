const whatsappConfig = require('../config/whatsapp');

function verify(req, res) {
  console.log('[Webhook] GET /webhook (verify)');
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
    console.log('[Webhook] Verification OK');
    res.status(200).send(challenge);
  } else {
    console.log('[Webhook] Verification failed: mode=', mode, 'token match=', token === whatsappConfig.verifyToken);
    res.status(403).send('Forbidden');
  }
}

function handlePost(req, res) {
  console.log('[Webhook] POST /webhook received');
  const body = req.body;
  const bodyPreview = typeof body === 'object' && body !== null
    ? JSON.stringify(body).slice(0, 600)
    : String(body).slice(0, 200);
  console.log('[Webhook] Body preview:', bodyPreview);

  res.sendStatus(200);

  if (!body || typeof body !== 'object') {
    console.log('[Webhook] No body or invalid body');
    return;
  }
  if (body.object !== 'whatsapp_business_account') {
    console.log('[Webhook] Ignoring object:', body.object);
    return;
  }

  const entries = body.entry || [];
  console.log('[Webhook] Entries:', entries.length);
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const messages = value.messages || [];
      if (messages.length === 0) continue; // status updates (sent/delivered/read) have no messages
      console.log('[Webhook] Processing', messages.length, 'message(s)');
      setImmediate(() => {
        const whatsappIncomingService = require('../services/whatsappIncomingService');
        whatsappIncomingService.handleIncoming(value).catch((err) => {
          console.error('[Webhook] handleIncoming error:', err);
        });
      });
    }
  }
}

module.exports = { verify, handlePost };
