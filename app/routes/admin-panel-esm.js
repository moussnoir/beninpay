/**
 * Admin Panel - Routes (ESM compatible)
 */

import express from 'express';
import { query, run, get } from '../../db/init.js';

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beninpay2026';

// Middleware auth admin
const authenticateAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password || req.body.password;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
  }

  next();
};

// Dashboard admin
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const stats = await get(`
      SELECT
        COUNT(DISTINCT merchant_id) as total_merchants,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as total_profit
      FROM transactions
    `);

    const pendingWithdrawals = await query(`
      SELECT w.*, m.shop_domain, m.shop_name, m.email, m.balance as merchant_balance
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status = 'pending'
      ORDER BY w.requested_at ASC
    `);

    const recentWithdrawals = await query(`
      SELECT w.*, m.shop_domain, m.shop_name
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status != 'pending'
      ORDER BY w.processed_at DESC
      LIMIT 20
    `);

    const recentTransactions = await query(`
      SELECT t.*, m.shop_domain
      FROM transactions t
      JOIN merchants m ON t.merchant_id = m.id
      ORDER BY t.created_at DESC
      LIMIT 20
    `);

    const merchantBalances = await query(`
      SELECT
        id,
        shop_domain,
        shop_name,
        balance,
        total_earned,
        total_withdrawn,
        status
      FROM merchants
      WHERE balance > 0 OR total_earned > 0
      ORDER BY balance DESC
    `);

    res.json({
      stats: {
        total_merchants: stats?.total_merchants || 0,
        total_transactions: stats?.total_transactions || 0,
        total_volume: stats?.total_volume || 0,
        total_profit: stats?.total_profit || 0
      },
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

    let sql = `
      SELECT w.*, m.shop_domain, m.shop_name, m.email, m.phone
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
    `;

    const params = [];

    if (status) {
      sql += ' WHERE w.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY w.requested_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const withdrawals = await query(sql, params);

    res.json({ withdrawals });
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

    const withdrawal = await get(`
      SELECT w.*, m.balance as merchant_balance
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.id = ?
    `, [id]);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve withdrawal with status: ${withdrawal.status}` });
    }

    if (withdrawal.merchant_balance < withdrawal.amount) {
      return res.status(400).json({
        error: 'Merchant insufficient balance',
        balance: withdrawal.merchant_balance,
        requested: withdrawal.amount
      });
    }

    await run(`
      UPDATE withdrawals
      SET status = 'approved', admin_note = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [note || 'Approved by admin', id]);

    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [withdrawal.merchant_id, 'withdrawal_approved', `Retrait #${id} approuvé`, withdrawal.amount]);

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

    const withdrawal = await get('SELECT * FROM withdrawals WHERE id = ?', [id]);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject withdrawal with status: ${withdrawal.status}` });
    }

    await run(`
      UPDATE withdrawals
      SET status = 'rejected', admin_note = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason, id]);

    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [withdrawal.merchant_id, 'withdrawal_rejected', `Retrait #${id} rejeté: ${reason}`, withdrawal.amount]);

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

    const withdrawal = await get(`
      SELECT w.*, m.balance as merchant_balance
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.id = ?
    `, [id]);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (!['approved', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({ error: 'Invalid withdrawal status' });
    }

    if (withdrawal.merchant_balance < withdrawal.amount) {
      return res.status(400).json({ error: 'Merchant insufficient balance' });
    }

    // Déduire le solde
    await run(`
      UPDATE merchants
      SET balance = balance - ?,
          total_withdrawn = total_withdrawn + ?
      WHERE id = ?
    `, [withdrawal.amount, withdrawal.amount, withdrawal.merchant_id]);

    // Compléter
    await run(`
      UPDATE withdrawals
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          admin_note = ?,
          fedapay_transfer_id = ?
      WHERE id = ?
    `, [note || 'Completed', fedapay_transfer_id || null, id]);

    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [withdrawal.merchant_id, 'withdrawal_completed', `Retrait #${id} complété`, withdrawal.amount]);

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

    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND created_at >= date('now')";
    } else if (period === 'week') {
      dateFilter = "AND created_at >= date('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= date('now', '-30 days')";
    }

    const stats = await get(`
      SELECT
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as total_profit,
        AVG(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as avg_profit_per_transaction
      FROM transactions
      WHERE 1=1 ${dateFilter}
    `);

    const withdrawalStats = await get(`
      SELECT
        COUNT(*) as total_withdrawals,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_withdrawn,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM withdrawals
      WHERE 1=1 ${dateFilter}
    `);

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
