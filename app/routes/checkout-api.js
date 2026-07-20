import express from 'express';
import { createPayment } from '../services/fedapay.service.js';
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

export default router;
