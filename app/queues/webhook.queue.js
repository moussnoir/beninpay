import Bull from 'bull';
import { pool } from '../../config/database.js';
import { sendPaymentConfirmation } from '../services/notification.service.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let webhookQueue = null;
let payoutQueue = null;

try {
  webhookQueue = new Bull('webhook-processing', REDIS_URL, {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  payoutQueue = new Bull('payout-processing', REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
    },
  });

  webhookQueue.process(async (job) => {
    const { source, eventType, payload } = job.data;
    console.log(`[Queue] Processing webhook: ${source}/${eventType}`);

    if (source === 'fedapay' && eventType === 'transaction.approved') {
      await processFedapayApproved(payload);
    } else if (source === 'shopify' && eventType === 'orders/create') {
      await processShopifyOrderCreated(payload);
    }

    return { processed: true, source, eventType };
  });

  payoutQueue.process(async (job) => {
    const { withdrawalId } = job.data;
    console.log(`[Queue] Processing payout: withdrawal #${withdrawalId}`);
    return { processed: true, withdrawalId };
  });

  webhookQueue.on('failed', (job, err) => {
    console.error(`[Queue] Webhook job ${job.id} failed:`, err.message);
  });

  console.log('[Queue] Bull queues initialized (Redis:', REDIS_URL, ')');
} catch (error) {
  console.warn('[Queue] Redis not available, running without queues:', error.message);
}

async function processFedapayApproved(payload) {
  const { transaction_id, amount, custom_metadata } = payload;
  const orderId = custom_metadata?.order_id;
  const merchantShop = custom_metadata?.shop_domain;

  if (!merchantShop) return;

  try {
    const merchantResult = await pool.query(
      'SELECT * FROM merchants WHERE shop_domain = $1',
      [merchantShop]
    );
    const merchant = merchantResult.rows[0];
    if (!merchant) return;

    const fee = Math.round(amount * 0.02);
    const merchantAmount = amount - fee;

    await pool.query(
      `INSERT INTO transactions (merchant_id, fedapay_transaction_id, order_id, amount, beninpay_fee, merchant_amount, total, status, customer_name, customer_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9)`,
      [merchant.id, transaction_id, orderId, amount, fee, merchantAmount, amount,
       custom_metadata?.customer_name || '', custom_metadata?.customer_email || '']
    );

    await pool.query(
      'UPDATE merchants SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
      [merchantAmount, merchant.id]
    );

    if (merchant.email) {
      await sendPaymentConfirmation(merchant.email, {
        id: transaction_id,
        amount,
        beninpay_fee: fee,
        merchant_amount: merchantAmount,
        customer_name: custom_metadata?.customer_name,
      });
    }

    console.log(`[Queue] Payment processed: ${amount} FCFA for ${merchantShop}`);
  } catch (error) {
    console.error('[Queue] Error processing FedaPay webhook:', error.message);
    throw error;
  }
}

async function processShopifyOrderCreated(payload) {
  const { shop_domain, order_id, total_price, customer } = payload;

  try {
    await pool.query(
      `INSERT INTO activity_logs (merchant_id, action, description, metadata)
       SELECT id, 'order_created', $2, $3::jsonb FROM merchants WHERE shop_domain = $1`,
      [shop_domain, `Nouvelle commande #${order_id}: ${total_price} FCFA`,
       JSON.stringify({ order_id, total_price, customer_email: customer?.email })]
    );
  } catch (error) {
    console.error('[Queue] Error processing Shopify order:', error.message);
    throw error;
  }
}

export function addWebhookJob(source, eventType, payload) {
  if (!webhookQueue) {
    console.log('[Queue] No Redis, processing inline');
    if (source === 'fedapay' && eventType === 'transaction.approved') {
      processFedapayApproved(payload).catch(console.error);
    }
    return;
  }
  webhookQueue.add({ source, eventType, payload });
}

export function addPayoutJob(withdrawalId) {
  if (!payoutQueue) return;
  payoutQueue.add({ withdrawalId });
}

export { webhookQueue, payoutQueue };
