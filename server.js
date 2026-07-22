import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { createPayment, checkTransactionStatus } from './app/services/fedapay.service.js';
import { injectButtonIntoTheme, removeButtonFromTheme } from './app/services/theme-inject.service.js';
import merchantRoutes from './app/routes/merchant-api.js';
import adminRoutes from './app/routes/admin-api.js';
import shopifyAuthRoutes from './app/routes/shopify-auth.js';
import registerRoutes from './app/routes/register-api.js';
import webhookRoutes from './app/routes/webhook-api.js';
import exportRoutes from './app/routes/export-api.js';
import analyticsRoutes from './app/routes/analytics-api.js';
import checkoutRoutes from './app/routes/checkout-api.js';
import { apiLimiter, paymentLimiter, webhookLimiter } from './app/middleware/rate-limiter.js';

dotenv.config();

// Sentry error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('[Sentry] Error tracking enabled');
}

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[BeninPay] Starting server v2.1...');
console.log('[BeninPay] Environment:', process.env.NODE_ENV || 'development');
console.log('[BeninPay] Root / -> merchant-dashboard.html (always)');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/payment/initiate', paymentLimiter);
app.use('/webhooks/', webhookLimiter);

// Route principale - toujours rediriger vers le merchant dashboard
app.get('/', (req, res) => {
  const shop = req.query.shop;
  const params = shop ? `?shop=${shop}` : '';
  return res.redirect(`/merchant-dashboard.html${params}`);
});

// Static files
app.use(express.static('public'));

// Routes
app.use('/merchant', merchantRoutes);
app.use('/admin', adminRoutes);
app.use('/shopify', shopifyAuthRoutes);
app.use('/api/register', registerRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/export', exportRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/api/checkout', checkoutRoutes);

// Plans API
app.get('/api/plans', (req, res) => {
  const PLANS = {
    FREE: {
      id: 'free', name: 'Gratuit', price: 0, currency: 'XOF',
      features: { maxTransactions: 10, commission: 3.5, operators: ['mtn', 'moov'], support: 'Email', dashboard: true, webhooks: false, customBranding: false },
      description: 'Parfait pour tester BeninPay', recommended: false
    },
    BASIC: {
      id: 'basic', name: 'Basique', price: 5000, currency: 'XOF',
      features: { maxTransactions: 100, commission: 3.5, operators: ['mtn', 'moov', 'celtis'], support: 'Email + Chat', dashboard: true, webhooks: true, customBranding: false },
      description: 'Pour les petites boutiques', recommended: true
    },
    PREMIUM: {
      id: 'premium', name: 'Premium', price: 25000, currency: 'XOF',
      features: { maxTransactions: -1, commission: 3.5, operators: ['mtn', 'moov', 'celtis'], support: 'Prioritaire 24/7', dashboard: true, webhooks: true, customBranding: true, analytics: true, apiAccess: true },
      description: 'Pour les grandes boutiques', recommended: false
    }
  };
  res.json({ success: true, plans: Object.values(PLANS), message: '3 plans disponibles' });
});

// Payment initiation
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { amount, phone, operator, customerName, customerEmail, description, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ success: false, error: 'amount et orderId requis' });
    }

    const callbackUrl = `${process.env.SHOPIFY_APP_URL}/webhooks/fedapay`;
    const result = await createPayment(
      amount, phone, operator,
      customerName || 'Client BeninPay',
      customerEmail || 'noreply@beninpay.com',
      description, callbackUrl, orderId
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('[Payment] Error:', error.message);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).json({ success: false, error: 'Erreur serveur', message: error.message });
  }
});

// Legacy webhook endpoint (backward compatible)
app.post('/api/payment/webhook', async (req, res) => {
  console.log('[Webhook] Legacy endpoint hit, forwarding to /webhooks/fedapay');
  try {
    const payload = req.body;
    const { addWebhookJob } = await import('./app/queues/webhook.queue.js');
    addWebhookJob('fedapay', payload.event || 'transaction.approved', payload.entity || payload);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Legacy error:', error);
    res.status(200).json({ received: true });
  }
});

// Payment status
app.get('/api/payment/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Transaction ID requis' });
    }
    const result = await checkTransactionStatus(transactionId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('[Status] Error:', error.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Theme button injection (manual reinstall)
app.post('/api/theme/inject-button', async (req, res) => {
  try {
    const { shop, accessToken } = req.body;
    if (!shop || !accessToken) {
      return res.status(400).json({ success: false, error: 'shop and accessToken required' });
    }
    const result = await injectButtonIntoTheme(shop, accessToken);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-inject using stored token (for existing installations)
app.get('/api/theme/auto-inject', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) {
      return res.status(400).json({ success: false, error: 'shop parameter required' });
    }
    const { loadData } = await import('./db/json-store.js');
    const data = loadData();
    const merchant = data.merchants?.find(m => m.shop_domain === shop);
    if (!merchant || !merchant.access_token) {
      return res.status(404).json({ success: false, error: 'Merchant not found or no access token. Reinstall the app.' });
    }
    const result = await injectButtonIntoTheme(shop, merchant.access_token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/theme/remove-button', async (req, res) => {
  try {
    const { shop, accessToken } = req.body;
    if (!shop || !accessToken) {
      return res.status(400).json({ success: false, error: 'shop and accessToken required' });
    }
    const result = await removeButtonFromTheme(shop, accessToken);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'BeninPay',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['webhooks', 'notifications', 'csv-export', 'analytics', 'rate-limiting', 'sentry'],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, () => {
  console.log(`\n[BeninPay] Server running on port ${PORT}`);
  console.log(`[BeninPay] Health: http://localhost:${PORT}/health`);
  console.log(`[BeninPay] Admin: http://localhost:${PORT}/admin-dashboard.html`);
  console.log(`[BeninPay] Features: webhooks, email, CSV export, analytics, rate-limit, Sentry\n`);
});

export default app;
