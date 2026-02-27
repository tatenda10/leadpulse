require('dotenv').config();
const express = require('express');
const routes = require('./routes');
const webhookController = require('./controllers/webhookController');
const { verifyWebhookSignature } = require('./middleware/verifyWebhookSignature');

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

// Log every request that hits /webhook so we know if Meta is calling us
app.use('/webhook', (req, res, next) => {
  console.log('[Webhook] Request:', req.method, req.url, new Date().toISOString());
  next();
});

// Webhook: POST must receive raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), verifyWebhookSignature, webhookController.handlePost);
// So you can test from browser/curl that this URL is reachable (e.g. via ngrok)
app.get('/webhook/ping', (req, res) => {
  console.log('[Webhook] GET /webhook/ping');
  res.send('OK - server is reachable');
});

app.use(express.json());

app.use('/', routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
