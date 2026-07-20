/**
 * API Marchands - Version simplifiée avec JSON store
 */

import express from 'express';
import { initDatabase, query, get, insert, update, loadData, saveData } from '../../db/json-store.js';

const router = express.Router();

// Init DB
await initDatabase();

// Middleware auth merchant
const authenticateMerchant = async (req, res, next) => {
  const shopDomain = req.query.shop || req.body.shop;

  if (!shopDomain) {
    return res.status(401).json({ error: 'Shop domain required' });
  }

  try {
    let merchant = await get('merchants', { shop_domain: shopDomain });

    if (!merchant) {
      const result = await insert('merchants', {
        shop_domain: shopDomain,
        shop_name: shopDomain,
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        status: 'active'
      });
      merchant = await get('merchants', { id: result.id });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('[Auth] Erreur:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Dashboard
router.get('/dashboard', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;

    // Transactions du marchand
    const transactions = await query('transactions', { merchant_id: merchant.id });
    const completedTransactions = transactions.filter(t => t.status === 'completed');

    const stats = {
      total_transactions: completedTransactions.length,
      total_earned: completedTransactions.reduce((sum, t) => sum + (t.merchant_amount || 0), 0),
      total_fees: completedTransactions.reduce((sum, t) => sum + (t.beninpay_fee || 0), 0)
    };

    // Dernières transactions
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // Retraits en cours
    const withdrawals = await query('withdrawals', { merchant_id: merchant.id });
    const pendingWithdrawals = withdrawals.filter(w => ['pending', 'processing'].includes(w.status))
      .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

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
      stats,
      recent_transactions: recentTransactions,
      pending_withdrawals: pendingWithdrawals
    });
  } catch (error) {
    console.error('[Dashboard] Erreur:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Demander retrait
router.post('/withdrawal/request', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { amount, mobile_money_operator, mobile_money_number } = req.body;

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

    const fee = 0;
    const netAmount = amount - fee;

    const result = await insert('withdrawals', {
      merchant_id: merchant.id,
      amount,
      fee,
      net_amount: netAmount,
      mobile_money_operator,
      mobile_money_number,
      status: 'pending',
      requested_at: new Date().toISOString()
    });

    await insert('activity_logs', {
      merchant_id: merchant.id,
      action: 'withdrawal_requested',
      description: `Retrait de ${amount} FCFA vers ${mobile_money_operator}`,
      amount
    });

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

// Liste retraits
router.get('/withdrawals', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const withdrawals = await query('withdrawals', { merchant_id: merchant.id });

    withdrawals.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

    res.json({ withdrawals });
  } catch (error) {
    console.error('[Withdrawals] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Historique transactions
router.get('/transactions', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await query('transactions', { merchant_id: merchant.id });
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const paginatedTransactions = transactions.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Transactions] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Mettre à jour infos paiement
router.post('/payment-info', authenticateMerchant, async (req, res) => {
  try {
    const merchant = req.merchant;
    const { mobile_money_operator, mobile_money_number, email, phone } = req.body;

    await update('merchants', { id: merchant.id }, {
      mobile_money_operator,
      mobile_money_number,
      email,
      phone
    });

    res.json({ success: true, message: 'Payment info updated' });
  } catch (error) {
    console.error('[PaymentInfo] Erreur:', error);
    res.status(500).json({ error: 'Failed to update payment info' });
  }
});

export default router;
