/**
 * Admin Panel - Gérer les retraits et surveiller le système
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { query, run, get } = require('../../db/init');

// Mot de passe admin simple (à améliorer avec bcrypt + env var)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beninpay2026';

// Middleware auth admin
const authenticateAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password || req.body.password;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
  }

  next();
};

// Dashboard admin - Vue d'ensemble
router.get('/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Stats globales
    const stats = await get(`
      SELECT
        COUNT(DISTINCT merchant_id) as total_merchants,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as total_profit
      FROM transactions
    `);

    // Retraits en attente
    const pendingWithdrawals = await query(`
      SELECT w.*, m.shop_domain, m.shop_name, m.email, m.balance as merchant_balance
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status = 'pending'
      ORDER BY w.requested_at ASC
    `);

    // Retraits récents
    const recentWithdrawals = await query(`
      SELECT w.*, m.shop_domain, m.shop_name
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status != 'pending'
      ORDER BY w.processed_at DESC
      LIMIT 20
    `);

    // Transactions récentes
    const recentTransactions = await query(`
      SELECT t.*, m.shop_domain
      FROM transactions t
      JOIN merchants m ON t.merchant_id = m.id
      ORDER BY t.created_at DESC
      LIMIT 20
    `);

    // Soldes marchands
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

// Liste des retraits avec filtres
router.get('/admin/withdrawals', authenticateAdmin, async (req, res) => {
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

// Approuver un retrait
router.post('/admin/withdrawal/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    // Récupérer le retrait
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

    // Vérifier que le marchand a assez de solde
    if (withdrawal.merchant_balance < withdrawal.amount) {
      return res.status(400).json({
        error: 'Merchant insufficient balance',
        balance: withdrawal.merchant_balance,
        requested: withdrawal.amount
      });
    }

    // Mettre à jour le statut
    await run(`
      UPDATE withdrawals
      SET status = 'approved', admin_note = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [note || 'Approved by admin', id]);

    // Log
    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [withdrawal.merchant_id, 'withdrawal_approved', `Retrait #${id} approuvé`, withdrawal.amount]);

    res.json({
      success: true,
      message: 'Withdrawal approved. Ready for processing.',
      withdrawal_id: id
    });
  } catch (error) {
    console.error('[Admin Approve] Erreur:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

// Rejeter un retrait
router.post('/admin/withdrawal/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required for rejection' });
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

    // Log
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

// Traiter un retrait (envoyer l'argent)
router.post('/admin/withdrawal/:id/process', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fedapay_transfer_id } = req.body;

    const withdrawal = await get(`
      SELECT w.*, m.balance as merchant_balance
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.id = ?
    `, [id]);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({ error: 'Withdrawal must be approved first' });
    }

    // Mettre à jour le statut
    await run(`
      UPDATE withdrawals
      SET status = 'processing', fedapay_transfer_id = ?
      WHERE id = ?
    `, [fedapay_transfer_id || null, id]);

    res.json({
      success: true,
      message: 'Withdrawal marked as processing',
      withdrawal_id: id
    });
  } catch (error) {
    console.error('[Admin Process] Erreur:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Compléter un retrait (argent envoyé)
router.post('/admin/withdrawal/:id/complete', authenticateAdmin, async (req, res) => {
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

    if (!['approved', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({ error: 'Invalid withdrawal status' });
    }

    // Vérifier solde
    if (withdrawal.merchant_balance < withdrawal.amount) {
      return res.status(400).json({ error: 'Merchant insufficient balance' });
    }

    // Déduire le solde du marchand
    await run(`
      UPDATE merchants
      SET balance = balance - ?,
          total_withdrawn = total_withdrawn + ?
      WHERE id = ?
    `, [withdrawal.amount, withdrawal.amount, withdrawal.merchant_id]);

    // Compléter le retrait
    await run(`
      UPDATE withdrawals
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, admin_note = ?
      WHERE id = ?
    `, [note || 'Completed', id]);

    // Log
    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, ?, ?, ?)
    `, [withdrawal.merchant_id, 'withdrawal_completed', `Retrait #${id} complété`, withdrawal.amount]);

    res.json({
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal_id: id,
      amount: withdrawal.amount
    });
  } catch (error) {
    console.error('[Admin Complete] Erreur:', error);
    res.status(500).json({ error: 'Failed to complete withdrawal' });
  }
});

// Envoyer via FedaPay (optionnel - nécessite API de transfert FedaPay)
router.post('/admin/withdrawal/:id/send-fedapay', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await get('SELECT * FROM withdrawals WHERE id = ?', [id]);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // TODO: Implémenter l'API FedaPay pour transferts
    // Pour l'instant, retourner une erreur avec instructions

    res.status(501).json({
      error: 'FedaPay transfer API not implemented',
      instructions: {
        step1: 'Connectez-vous à FedaPay dashboard',
        step2: 'Allez dans Payouts/Transfers',
        step3: `Envoyez ${withdrawal.amount} FCFA à ${withdrawal.mobile_money_number} (${withdrawal.mobile_money_operator})`,
        step4: 'Notez le Transfer ID',
        step5: 'Appelez POST /admin/withdrawal/:id/complete avec le transfer_id'
      },
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        operator: withdrawal.mobile_money_operator,
        number: withdrawal.mobile_money_number
      }
    });
  } catch (error) {
    console.error('[Admin FedaPay] Erreur:', error);
    res.status(500).json({ error: 'Failed to send via FedaPay' });
  }
});

// Stats globales
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
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

module.exports = router;
