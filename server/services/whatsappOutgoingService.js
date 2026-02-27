const whatsappConfig = require('../config/whatsapp');

const BASE_URL = 'https://graph.facebook.com/v18.0';

async function sendText(phoneNumberId, toWaId, text) {
  const id = phoneNumberId || whatsappConfig.phoneNumberId;
  const token = whatsappConfig.accessToken;
  if (!id || !token) {
    throw new Error('WhatsApp phone_number_id and access_token must be set');
  }
  const to = String(toWaId).replace(/\D/g, '');
  const res = await fetch(`${BASE_URL}/${id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `WhatsApp API ${res.status}: ${res.statusText}`);
  }
  return data.messages?.[0]?.id || null;
}

module.exports = { sendText };
