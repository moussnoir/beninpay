/**
 * Route API Checkout
 * Génère URL de paiement BeninPay pour commandes Shopify
 */

import express from 'express';
const router = express.Router();

/**
 * POST /api/checkout
 * Crée une session de paiement et retourne l'URL
 */
router.post('/checkout', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      currency = 'XOF',
      customerName,
      customerEmail,
      shopDomain,
      shopName,
      returnUrl,
      items = []
    } = req.body;

    // Validation
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'orderId et amount sont requis'
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Le montant minimum est 100 XOF'
      });
    }

    // Construire URL checkout
    const checkoutUrl = new URL('/checkout.html', process.env.SHOPIFY_APP_URL || 'http://localhost:3000');

    // Paramètres
    checkoutUrl.searchParams.set('orderId', orderId);
    checkoutUrl.searchParams.set('amount', amount.toString());
    checkoutUrl.searchParams.set('currency', currency);

    if (customerName) checkoutUrl.searchParams.set('customerName', customerName);
    if (customerEmail) checkoutUrl.searchParams.set('customerEmail', customerEmail);
    if (shopDomain) checkoutUrl.searchParams.set('shopDomain', shopDomain);
    if (shopName) checkoutUrl.searchParams.set('shopName', shopName);
    if (returnUrl) checkoutUrl.searchParams.set('returnUrl', returnUrl);

    // Items (JSON encodé)
    if (items.length > 0) {
      checkoutUrl.searchParams.set('items', encodeURIComponent(JSON.stringify(items)));
    }

    console.log('✅ Checkout URL créée:', checkoutUrl.href);

    res.json({
      success: true,
      checkoutUrl: checkoutUrl.href,
      orderId,
      amount,
      currency
    });

  } catch (error) {
    console.error('❌ Erreur checkout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/checkout/test
 * URL de test pour démo
 */
router.get('/checkout/test', (req, res) => {
  const testUrl = new URL('/checkout.html', process.env.SHOPIFY_APP_URL || 'http://localhost:3000');

  // Données de test
  testUrl.searchParams.set('orderId', 'TEST-' + Date.now());
  testUrl.searchParams.set('amount', '82500');
  testUrl.searchParams.set('shopName', 'Ma Boutique Test');
  testUrl.searchParams.set('customerName', 'Jean Dupont');
  testUrl.searchParams.set('customerEmail', 'jean@example.com');

  const testItems = [
    { name: 'Tableau LED Neon Rose', quantity: 1, price: 45000, emoji: '💡' },
    { name: 'Tableau LED Paysage', quantity: 2, price: 36000, emoji: '🎨' }
  ];

  testUrl.searchParams.set('items', encodeURIComponent(JSON.stringify(testItems)));

  res.redirect(testUrl.href);
});

export default router;
