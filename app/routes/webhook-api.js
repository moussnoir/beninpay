import express from 'express';
import crypto from 'crypto';
import { addWebhookJob } from '../queues/webhook.queue.js';
import { loadData, saveData } from '../../db/json-store.js';
import { sendPaymentConfirmation } from '../services/notification.service.js';

const router = express.Router();

// GET /webhooks/fedapay — FedaPay redirige le client ici apres paiement
router.get('/fedapay', (req, res) => {
  const { id, status, transaction_id } = req.query;
  const orderId = req.query.order_id || req.query.custom_metadata || '';
  console.log('[Webhook GET] Client redirect from FedaPay:', { id, status, transaction_id });
  res.redirect(`/checkout.html?order=${orderId || transaction_id || id || 'unknown'}&status=${status || 'completed'}`);
});

router.post('/fedapay', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Webhook] FedaPay event received:', payload.entity, payload.event);

    const event = payload.event || 'unknown';
    const entity = payload.entity || {};

    // Log the webhook
    const data = loadData();
    if (!data.webhook_events) data.webhook_events = [];
    data.webhook_events.push({
      id: data.webhook_events.length + 1,
      source: 'fedapay',
      event_type: event,
      payload: JSON.stringify(payload),
      status: 'received',
      created_at: new Date().toISOString()
    });
    saveData(data);

    if (event === 'transaction.approved' || entity.status === 'approved') {
      const transactionId = entity.id || entity.transaction_id;
      const amount = entity.amount;
      const metadata = entity.custom_metadata || {};

      const shopDomain = metadata.shop_domain;

      // Marquer la commande (orders) comme payee
      if (!data.orders) data.orders = [];
      const orderRef = metadata.order_id || '';
      const matchingOrder = data.orders.find(o =>
        o.order_ref === orderRef ||
        o.fedapay_transaction_id === String(transactionId)
      );
      if (matchingOrder) {
        matchingOrder.status = 'paid';
        matchingOrder.payment_status = 'completed';
        matchingOrder.paid_at = new Date().toISOString();
        console.log(`[Webhook] Order marked as paid: ${matchingOrder.order_ref}`);
      }

      if (shopDomain) {
        let merchant = data.merchants.find(m => m.shop_domain === shopDomain);
        if (merchant) {
          const fee = Math.round(amount * 0.02);
          const merchantAmount = amount - fee;

          // Create transaction record
          const txn = {
            id: (data.transactions || []).length + 1,
            merchant_id: merchant.id,
            fedapay_transaction_id: String(transactionId),
            order_id: orderRef,
            shop_domain: shopDomain,
            amount: amount,
            beninpay_fee: fee,
            beninpay_profit: fee,
            merchant_amount: merchantAmount,
            total: amount,
            status: 'completed',
            customer_name: metadata.customer_name || (matchingOrder?.customer_name) || '',
            customer_email: metadata.customer_email || (matchingOrder?.customer_email) || '',
            operator: entity.mode || (matchingOrder?.operator) || '',
            product_title: matchingOrder?.product_title || '',
            created_at: new Date().toISOString()
          };
          if (!data.transactions) data.transactions = [];
          data.transactions.push(txn);

          // Update merchant balance
          merchant.balance = (merchant.balance || 0) + merchantAmount;
          merchant.total_earned = (merchant.total_earned || 0) + merchantAmount;

          saveData(data);

          // Send notification
          if (merchant.email) {
            sendPaymentConfirmation(merchant.email, txn).catch(console.error);
          }

          console.log(`[Webhook] Payment processed: ${amount} FCFA -> ${shopDomain} (fee: ${fee})`);
        } else {
          saveData(data);
        }
      } else {
        saveData(data);
      }

      // Also try queue-based processing
      addWebhookJob('fedapay', 'transaction.approved', { ...entity, custom_metadata: metadata });
    }

    res.status(200).json({ received: true, event });
  } catch (error) {
    console.error('[Webhook] FedaPay error:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

router.post('/shopify', async (req, res) => {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const topic = req.headers['x-shopify-topic'];
    const shopDomain = req.headers['x-shopify-shop-domain'];

    console.log(`[Webhook] Shopify event: ${topic} from ${shopDomain}`);

    // Verify HMAC if secret is configured
    if (process.env.SHOPIFY_API_SECRET && hmacHeader) {
      const rawBody = JSON.stringify(req.body);
      const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');

      if (hash !== hmacHeader) {
        console.warn('[Webhook] Shopify HMAC verification failed');
        return res.status(401).json({ error: 'HMAC verification failed' });
      }
    }

    const data = loadData();
    if (!data.webhook_events) data.webhook_events = [];
    data.webhook_events.push({
      id: data.webhook_events.length + 1,
      source: 'shopify',
      event_type: topic,
      payload: JSON.stringify({ shop: shopDomain, topic, order_id: req.body.id }),
      status: 'received',
      created_at: new Date().toISOString()
    });
    saveData(data);

    if (topic === 'orders/create') {
      const order = req.body;
      console.log(`[Webhook] New Shopify order #${order.id}: ${order.total_price} ${order.currency}`);

      addWebhookJob('shopify', 'orders/create', {
        shop_domain: shopDomain,
        order_id: order.id,
        total_price: parseFloat(order.total_price),
        currency: order.currency,
        customer: order.customer,
      });
    } else if (topic === 'orders/paid') {
      console.log(`[Webhook] Shopify order paid: #${req.body.id}`);
    } else if (topic === 'app/uninstalled') {
      console.log(`[Webhook] App uninstalled from: ${shopDomain}`);
      const merchant = data.merchants.find(m => m.shop_domain === shopDomain);
      if (merchant) {
        merchant.status = 'inactive';
        saveData(data);
      }
    }

    res.status(200).json({ received: true, topic });
  } catch (error) {
    console.error('[Webhook] Shopify error:', error);
    res.status(200).json({ received: true });
  }
});

router.get('/events', async (req, res) => {
  const { source, limit = 50 } = req.query;
  const data = loadData();
  let events = data.webhook_events || [];

  if (source) {
    events = events.filter(e => e.source === source);
  }

  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  events = events.slice(0, parseInt(limit));

  res.json({ events, total: events.length });
});

export default router;
