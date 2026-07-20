/**
 * API Admin - Version simplifiée avec JSON store
 */

import express from 'express';
import { query, get, insert, update, loadData, saveData } from '../../db/json-store.js';

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beninpay2026';

// Middleware auth admin
const authenticateAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password || req.body.password;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Dashboard admin
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const data = loadData();

    const transactions = data.transactions || [];
    const completedTransactions = transactions.filter(t => t.status === 'completed');

    const stats = {
      total_merchants: new Set(transactions.map(t => t.merchant_id)).size,
      total_transactions: completedTransactions.length,
      total_volume: completedTransactions.reduce((sum, t) => sum + (t.total || 0), 0),
      total_profit: completedTransactions.reduce((sum, t) => sum + (t.beninpay_profit || 0), 0)
    };

    const withdrawals = data.withdrawals || [];
    const merchants = data.merchants || [];

    // Enrichir les retraits avec infos marchands
    const enrichWithdrawals = withdrawals.map(w => {
      const merchant = merchants.find(m => m.id === w.merchant_id);
      return {
        ...w,
        shop_domain: merchant?.shop_domain || 'unknown',
        shop_name: merchant?.shop_name || 'unknown',
        email: merchant?.email || '',
        merchant_balance: merchant?.balance || 0
      };
    });

    const pendingWithdrawals = enrichWithdrawals
      .filter(w => w.status === 'pending')
      .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));

    const recentWithdrawals = enrichWithdrawals
      .filter(w => w.status !== 'pending')
      .sort((a, b) => new Date(b.processed_at || b.requested_at) - new Date(a.processed_at || a.requested_at))
      .slice(0, 20);

    // Enrichir transactions avec shop_domain
    const enrichTransactions = transactions.map(t => {
      const merchant = merchants.find(m => m.id === t.merchant_id);
      return { ...t, shop_domain: merchant?.shop_domain || 'unknown' };
    });

    const recentTransactions = enrichTransactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    const merchantBalances = merchants
      .filter(m => (m.balance > 0 || m.total_earned > 0))
      .sort((a, b) => (b.balance || 0) - (a.balance || 0));

    res.json({
      stats,
      pending_withdrawals: pendingWithdrawals,
      recent_withdrawals: recentWithdrawals,
      recent_transactions: recentTransactions,
      merchant_balances: merchantBalances
    });
  } catch (error) {
    console.error('[Admin Dashboard] Erreur:', error);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
});

// Liste retraits
router.get('/withdrawals', authenticateAdmin, async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    const data = loadData();
    let withdrawals = data.withdrawals || [];
    const merchants = data.merchants || [];

    // Filtrer par statut si fourni
    if (status) {
      withdrawals = withdrawals.filter(w => w.status === status);
    }

    // Enrichir avec infos marchands
    withdrawals = withdrawals.map(w => {
      const merchant = merchants.find(m => m.id === w.merchant_id);
      return {
        ...w,
        shop_domain: merchant?.shop_domain || 'unknown',
        shop_name: merchant?.shop_name || 'unknown',
        email: merchant?.email || '',
        phone: merchant?.phone || ''
      };
    });

    withdrawals.sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

    const paginatedWithdrawals = withdrawals.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ withdrawals: paginatedWithdrawals });
  } catch (error) {
    console.error('[Admin Withdrawals] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Approuver retrait
router.post('/withdrawal/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const data = loadData();
    const withdrawal = data.withdrawals.find(w => w.id === parseInt(id));
    const merchant = data.merchants.find(m => m.id === withdrawal?.merchant_id);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve withdrawal with status: ${withdrawal.status}` });
    }

    if (!merchant || merchant.balance < withdrawal.amount) {
      return res.status(400).json({
        error: 'Merchant insufficient balance',
        balance: merchant?.balance || 0,
        requested: withdrawal.amount
      });
    }

    await update('withdrawals', { id: parseInt(id) }, {
      status: 'approved',
      admin_note: note || 'Approved by admin',
      processed_at: new Date().toISOString()
    });

    await insert('activity_logs', {
      merchant_id: withdrawal.merchant_id,
      action: 'withdrawal_approved',
      description: `Retrait #${id} approuvé`,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Withdrawal approved',
      withdrawal_id: id
    });
  } catch (error) {
    console.error('[Admin Approve] Erreur:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

// Rejeter retrait
router.post('/withdrawal/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const data = loadData();
    const withdrawal = data.withdrawals.find(w => w.id === parseInt(id));

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject withdrawal with status: ${withdrawal.status}` });
    }

    await update('withdrawals', { id: parseInt(id) }, {
      status: 'rejected',
      admin_note: reason,
      processed_at: new Date().toISOString()
    });

    await insert('activity_logs', {
      merchant_id: withdrawal.merchant_id,
      action: 'withdrawal_rejected',
      description: `Retrait #${id} rejeté: ${reason}`,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected',
      withdrawal_id: id,
      reason
    });
  } catch (error) {
    console.error('[Admin Reject] Erreur:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

// Compléter retrait
router.post('/withdrawal/:id/complete', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note, fedapay_transfer_id } = req.body;

    const data = loadData();
    const withdrawal = data.withdrawals.find(w => w.id === parseInt(id));
    const merchant = data.merchants.find(m => m.id === withdrawal?.merchant_id);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (!['approved', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({ error: 'Invalid withdrawal status' });
    }

    if (!merchant || merchant.balance < withdrawal.amount) {
      return res.status(400).json({ error: 'Merchant insufficient balance' });
    }

    // Déduire le solde
    await update('merchants', { id: merchant.id }, {
      balance: merchant.balance - withdrawal.amount,
      total_withdrawn: (merchant.total_withdrawn || 0) + withdrawal.amount
    });

    // Compléter
    await update('withdrawals', { id: parseInt(id) }, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      admin_note: note || 'Completed',
      fedapay_transfer_id: fedapay_transfer_id || null
    });

    await insert('activity_logs', {
      merchant_id: withdrawal.merchant_id,
      action: 'withdrawal_completed',
      description: `Retrait #${id} complété`,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Withdrawal completed',
      withdrawal_id: id,
      amount: withdrawal.amount
    });
  } catch (error) {
    console.error('[Admin Complete] Erreur:', error);
    res.status(500).json({ error: 'Failed to complete withdrawal' });
  }
});

// Stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    const data = loadData();
    let transactions = data.transactions || [];
    let withdrawals = data.withdrawals || [];

    // Filtrer par période
    const now = new Date();
    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      transactions = transactions.filter(t => new Date(t.created_at) >= today);
      withdrawals = withdrawals.filter(w => new Date(w.requested_at) >= today);
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      transactions = transactions.filter(t => new Date(t.created_at) >= weekAgo);
      withdrawals = withdrawals.filter(w => new Date(w.requested_at) >= weekAgo);
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      transactions = transactions.filter(t => new Date(t.created_at) >= monthAgo);
      withdrawals = withdrawals.filter(w => new Date(w.requested_at) >= monthAgo);
    }

    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');

    const stats = {
      transaction_count: completedTransactions.length,
      total_volume: completedTransactions.reduce((sum, t) => sum + (t.total || 0), 0),
      total_profit: completedTransactions.reduce((sum, t) => sum + (t.beninpay_profit || 0), 0),
      avg_profit_per_transaction: completedTransactions.length > 0
        ? completedTransactions.reduce((sum, t) => sum + (t.beninpay_profit || 0), 0) / completedTransactions.length
        : 0
    };

    const withdrawalStats = {
      total_withdrawals: completedWithdrawals.length,
      total_withdrawn: completedWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0),
      pending_count: withdrawals.filter(w => w.status === 'pending').length
    };

    res.json({
      period,
      transactions: stats,
      withdrawals: withdrawalStats
    });
  } catch (error) {
    console.error('[Admin Stats] Erreur:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
