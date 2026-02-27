require('dotenv').config();
const whatsappOutgoingService = require('../services/whatsappOutgoingService');

const TO_NUMBER = '263771472707';
const MESSAGE = 'hie tatend to this number +263771472707';

async function main() {
  try {
    const messageId = await whatsappOutgoingService.sendText(null, TO_NUMBER, MESSAGE);
    console.log('Message sent successfully. Message ID:', messageId);
  } catch (err) {
    console.error('Failed to send message:', err.message);
    process.exitCode = 1;
  }
}

main();
