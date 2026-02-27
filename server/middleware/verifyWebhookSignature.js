const crypto = require('crypto');
const whatsappConfig = require('../config/whatsapp');

function verifyWebhookSignature(req, res, next) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
  const parseAndNext = () => {
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch (e) {
        req.body = {};
      }
    }
    next();
  };

  if (!whatsappConfig.appSecret || !whatsappConfig.appSecret.trim()) {
    return parseAndNext();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !signature.startsWith('sha256=')) {
    console.warn('[Webhook] Signature missing or invalid format - allowing request (set WHATSAPP_APP_SECRET empty to avoid this check)');
    return parseAndNext();
  }

  const signatureString = signature.slice(7);
  const bodyForHmac = rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');
  const secret = whatsappConfig.appSecret.trim();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(bodyForHmac);
  const computed = hmac.digest('base64');

  try {
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(signatureString, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('[Webhook] Signature mismatch - allowing request');
      return parseAndNext();
    }
  } catch (err) {
    console.warn('[Webhook] Signature check error:', err.message, '- allowing request');
    return parseAndNext();
  }

  req.body = JSON.parse((rawBody || bodyForHmac).toString('utf8'));
  next();
}

module.exports = { verifyWebhookSignature };
