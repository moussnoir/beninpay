/**
 * Dashboard Marchands - Routes
 * Permet aux marchands de voir leur solde et demander des retraits
 */

const express = require('express');
const router = express.Router();
const { query, run, get } = require('../../db/init');

// Middleware simple d'authentification (à améliorer en production)
const authenticateMerchant = async (req, res, next) => {
  const shopDomain = req.query.shop || req.body.shop;

  if (!shopDomain) {
    return res.status(401).json({ error: 'Shop domain required' });
  }

  try {
    const merchant = await get('SELECT * FROM merchants WHERE shop_domain = ?', [shopDomain]);

    if (!merchant) {
      // Créer le marchand s'il n'existe pas
      const result = await run(
        'INSERT INTO merchants (shop_domain, shop_name, status) VALUES (?, ?, ?)',
        [shopDomain, shopDomain, 'pending']
      );
      req.merchant = { id: result.id, shop_domain: shopDomain, balance: 0, status: 'pending' };
    } else {
      req.merchant = merchant;
    }

    next();
  } catch (error) {
    console.error('[Auth] Erreur:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Page dashboard principale
router.get('/dashboard', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;

    // Stats
    const stats = await get(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN merchant_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as total_fees
      FROM transactions
      WHERE merchant_id = ?
    `, [merchant.id]);

    // Transactions récentes
    const recentTransactions = await query(`
      SELECT * FROM transactions
      WHERE merchant_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [merchant.id]);

    // Retraits en cours
    const pendingWithdrawals = await query(`
      SELECT * FROM withdrawals
      WHERE merchant_id = ? AND status IN ('pending', 'processing')
      ORDER BY requested_at DESC
    `, [merchant.id]);

    res.json({
      merchant: {
        id: merchant.id,
        shop_domain: merchant.shop_domain,
        shop_name: merchant.shop_name,
        balance: merchant.balance || 0,
        total_earned: merchant.total_earned || 0,
        total_withdrawn: merchant.total_withdrawn || 0,
        status: merchant.status
      },
      stats: {
        total_transactions: stats?.total_transactions || 0,
        total_earned: stats?.total_earned || 0,
        total_fees: stats?.total_fees || 0
      },
      recent_transactions: recentTransactions,
      pending_withdrawals: pendingWithdrawals
    });
  } catch (error) {
    console.error('[Dashboard] Erreur:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Demander un retrait
router.post('/withdrawal/request', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { amount, mobile_money_operator, mobile_money_number } = req.body;

    // Validations
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (amount > merchant.balance) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance: merchant.balance,
        requested: amount
      });
    }

    if (!mobile_money_operator || !['MTN', 'Moov', 'Celtis'].includes(mobile_money_operator)) {
      return res.status(400).json({ error: 'Invalid mobile money operator' });
    }

    if (!mobile_money_number) {
      return res.status(400).json({ error: 'Mobile money number required' });
    }

    // Frais de retrait (0 pour l'instant, peut être configuré)
    const fee = 0;
    const netAmount = amount - fee;

    // Créer la demande de retrait
    const result = await run(`
      INSERT INTO withdrawals
      (merchant_id, amount, fee, net_amount, mobile_money_operator, mobile_money_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [merchant.id, amount, fee, netAmount, mobile_money_operator, mobile_money_number, 'pending']);

    // Log
    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [merchant.id, 'withdrawal_requested', `Retrait de ${amount} FCFA vers ${mobile_money_operator}`, amount]);

    res.json({
      success: true,
      withdrawal_id: result.id,
      amount,
      fee,
      net_amount: netAmount,
      status: 'pending',
      message: 'Retrait demandé avec succès. En attente de validation admin.'
    });
  } catch (error) {
    console.error('[Withdrawal] Erreur:', error);
    res.status(500).json({ error: 'Failed to request withdrawal' });
  }
});

// Liste des retraits
router.get('/withdrawals', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const withdrawals = await query(`
      SELECT * FROM withdrawals
      WHERE merchant_id = ?
      ORDER BY requested_at DESC
    `, [merchant.id]);

    res.json({ withdrawals });
  } catch (error) {
    console.error('[Withdrawals] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Historique des transactions
router.get('/transactions', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await query(`
      SELECT * FROM transactions
      WHERE merchant_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [merchant.id, parseInt(limit), parseInt(offset)]);

    const total = await get(`
      SELECT COUNT(*) as count FROM transactions WHERE merchant_id = ?
    `, [merchant.id]);

    res.json({
      transactions,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Transactions] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Mettre à jour les infos de paiement mobile money
router.post('/payment-info', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { mobile_money_operator, mobile_money_number, email, phone } = req.body;

    await run(`
      UPDATE merchants
      SET mobile_money_operator = ?,
          mobile_money_number = ?,
          email = ?,
          phone = ?
      WHERE id = ?
    `, [mobile_money_operator, mobile_money_number, email, phone, merchant.id]);

    res.json({ success: true, message: 'Payment info updated' });
  } catch (error) {
    console.error('[PaymentInfo] Erreur:', error);
    res.status(500).json({ error: 'Failed to update payment info' });
  }
});

module.exports = router;
