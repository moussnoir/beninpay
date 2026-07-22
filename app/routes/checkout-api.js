import express from 'express';
import { createPayment, checkTransactionStatus } from '../services/fedapay.service.js';
import { loadData, saveData } from '../../db/json-store.js';

const router = express.Router();

/**
 * POST /api/checkout/create
 * Cree une commande + initie le paiement FedaPay
 * Appele depuis le bouton "Payer avec Mobile Money" sur la page produit
 */
router.post('/create', async (req, res) => {
  try {
    const {
      shop,
      product_title,
      product_id,
      variant_id,
      quantity,
      amount,
      customer_name,
      customer_phone,
      customer_email,
      operator,
      cart_items,
      cart_token
    } = req.body;

    if (!shop || !amount || !customer_name || !customer_phone) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis: shop, amount, customer_name, customer_phone'
      });
    }

    if (amount < 100) {
      return res.status(400).json({ success: false, error: 'Montant minimum 100 FCFA' });
    }

    // Creer un ID de commande unique
    const orderId = `${shop.split('.')[0]}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Enregistrer la commande en attente dans la DB
    const data = loadData();
    if (!data.orders) data.orders = [];

    const order = {
      id: data.orders.length + 1,
      order_ref: orderId,
      shop_domain: shop,
      product_title: product_title || 'Produit',
      product_id: product_id || null,
      variant_id: variant_id || null,
      quantity: quantity || 1,
      amount: amount,
      customer_name: customer_name,
      customer_phone: customer_phone,
      customer_email: customer_email || '',
      operator: operator || '',
      cart_items: cart_items || [],
      cart_token: cart_token || null,
      status: 'pending_payment',
      payment_status: 'pending',
      fedapay_transaction_id: null,
      created_at: new Date().toISOString()
    };

    data.orders.push(order);
    saveData(data);

    console.log(`[Checkout] Order created: ${orderId} - ${amount} FCFA - ${product_title}`);

    // Initier le paiement FedaPay
    const callbackUrl = `${process.env.SHOPIFY_APP_URL}/webhooks/fedapay`;
    const description = `${product_title} x${quantity || 1} - ${shop}`;

    const paymentResult = await createPayment(
      amount,
      customer_phone,
      operator,
      customer_name,
      customer_email || 'noreply@beninpay.com',
      description,
      callbackUrl,
      orderId
    );

    if (paymentResult.success) {
      // Mettre a jour la commande avec l'ID FedaPay
      const orderIdx = data.orders.findIndex(o => o.order_ref === orderId);
      if (orderIdx >= 0) {
        data.orders[orderIdx].fedapay_transaction_id = paymentResult.transactionId;
        data.orders[orderIdx].payment_url = paymentResult.payment_url;
        saveData(data);
      }

      console.log(`[Checkout] Payment initiated: ${paymentResult.transactionId}`);

      res.json({
        success: true,
        order_id: orderId,
        transaction_id: paymentResult.transactionId,
        payment_url: paymentResult.payment_url,
        checkout_url: paymentResult.payment_url || `${process.env.SHOPIFY_APP_URL}/checkout.html?order=${orderId}`,
        message: 'Commande creee, redirection vers le paiement'
      });
    } else {
      // Paiement echoue, mais commande creee quand meme
      res.json({
        success: false,
        order_id: orderId,
        error: paymentResult.error || 'Erreur lors de l\'initiation du paiement',
        checkout_url: `${process.env.SHOPIFY_APP_URL}/checkout.html?order=${orderId}`
      });
    }
  } catch (error) {
    console.error('[Checkout] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/checkout/status/:orderId
 * Verifie le statut d'une commande
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const data = loadData();
    const order = (data.orders || []).find(o => o.order_ref === orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Commande non trouvee' });
    }

    res.json({
      success: true,
      order: {
        id: order.order_ref,
        product: order.product_title,
        amount: order.amount,
        status: order.status,
        payment_status: order.payment_status,
        customer_name: order.customer_name,
        created_at: order.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/checkout/orders
 * Liste les commandes pour un shop (merchant)
 */
router.get('/orders', async (req, res) => {
  try {
    const { shop, status } = req.query;
    const data = loadData();
    let orders = data.orders || [];

    if (shop) orders = orders.filter(o => o.shop_domain === shop);
    if (status) orders = orders.filter(o => o.status === status);

    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, orders, total: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/checkout/sync/:orderId
 * Synchronise le statut d'une commande avec FedaPay et met a jour le dashboard
 */
router.post('/sync/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const data = loadData();
    const order = (data.orders || []).find(o => o.order_ref === orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Commande non trouvee' });
    }

    // Si deja payee, rien a faire
    if (order.payment_status === 'completed') {
      return res.json({ success: true, message: 'Deja payee', order });
    }

    // Verifier le statut sur FedaPay
    let fedapayStatus = null;
    if (order.fedapay_transaction_id && !order.fedapay_transaction_id.startsWith('fb_')) {
      const result = await checkTransactionStatus(order.fedapay_transaction_id);
      if (result.success) {
        fedapayStatus = result.status;
      }
    }

    // Forcer la mise a jour si status=approved ou si demande manuelle
    const forceApprove = req.body.force === true;
    if (fedapayStatus === 'approved' || fedapayStatus === 'completed' || forceApprove) {
      order.status = 'paid';
      order.payment_status = 'completed';
      order.paid_at = new Date().toISOString();

      // Creer la transaction dans le dashboard marchand
      const shopDomain = order.shop_domain;
      const merchant = (data.merchants || []).find(m =>
        m.shop_domain === shopDomain ||
        shopDomain?.includes(m.shop_domain?.split('.')[0]) ||
        m.shop_domain?.includes(shopDomain?.split('.')[0])
      );

      if (merchant) {
        const amount = order.amount;
        const fee = Math.round(amount * 0.02);
        const merchantAmount = amount - fee;
        const txId = order.fedapay_transaction_id || `manual_${Date.now()}`;

        if (!data.transactions) data.transactions = [];
        const existing = data.transactions.find(t =>
          t.order_id === order.order_ref || t.fedapay_transaction_id === txId
        );

        if (!existing) {
          data.transactions.push({
            id: data.transactions.length + 1,
            merchant_id: merchant.id,
            fedapay_transaction_id: txId,
            order_id: order.order_ref,
            shop_domain: shopDomain,
            amount: amount,
            beninpay_fee: fee,
            beninpay_profit: fee,
            merchant_amount: merchantAmount,
            total: amount,
            status: 'completed',
            customer_name: order.customer_name || '',
            customer_email: order.customer_email || '',
            operator: order.operator || '',
            product_title: order.product_title || '',
            created_at: new Date().toISOString()
          });

          merchant.balance = (merchant.balance || 0) + merchantAmount;
          merchant.total_earned = (merchant.total_earned || 0) + merchantAmount;
        }
      }

      saveData(data);
      return res.json({
        success: true,
        message: 'Commande synchronisee et marquee comme payee',
        fedapay_status: fedapayStatus,
        order
      });
    }

    res.json({
      success: true,
      message: 'Transaction toujours en attente sur FedaPay',
      fedapay_status: fedapayStatus,
      order
    });
  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/checkout/sync-all
 * Synchronise TOUTES les commandes en attente
 */
router.post('/sync-all', async (req, res) => {
  try {
    const { shop } = req.body;
    const data = loadData();
    let orders = (data.orders || []).filter(o => o.payment_status !== 'completed');
    if (shop) orders = orders.filter(o => o.shop_domain === shop);

    let synced = 0;
    for (const order of orders) {
      if (order.fedapay_transaction_id && !order.fedapay_transaction_id.startsWith('fb_')) {
        const result = await checkTransactionStatus(order.fedapay_transaction_id);
        if (result.success && (result.status === 'approved' || result.status === 'completed')) {
          order.status = 'paid';
          order.payment_status = 'completed';
          order.paid_at = new Date().toISOString();

          const shopDomain = order.shop_domain;
          const merchant = (data.merchants || []).find(m =>
            m.shop_domain === shopDomain ||
            shopDomain?.includes(m.shop_domain?.split('.')[0])
          );

          if (merchant) {
            const amount = order.amount;
            const fee = Math.round(amount * 0.02);
            const merchantAmount = amount - fee;
            if (!data.transactions) data.transactions = [];
            const existing = data.transactions.find(t => t.order_id === order.order_ref);
            if (!existing) {
              data.transactions.push({
                id: data.transactions.length + 1,
                merchant_id: merchant.id,
                fedapay_transaction_id: order.fedapay_transaction_id,
                order_id: order.order_ref,
                shop_domain: shopDomain,
                amount,
                beninpay_fee: fee,
                beninpay_profit: fee,
                merchant_amount: merchantAmount,
                total: amount,
                status: 'completed',
                customer_name: order.customer_name || '',
                customer_email: order.customer_email || '',
                operator: order.operator || '',
                product_title: order.product_title || '',
                created_at: new Date().toISOString()
              });
              merchant.balance = (merchant.balance || 0) + merchantAmount;
              merchant.total_earned = (merchant.total_earned || 0) + merchantAmount;
            }
          }
          synced++;
        }
      }
    }

    saveData(data);
    res.json({ success: true, synced, total_pending: orders.length });
  } catch (error) {
    console.error('[SyncAll] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
