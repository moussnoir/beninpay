import express from 'express';
import { loadData } from '../../db/json-store.js';

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beninpay2026';

const auth = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/revenue', auth, (req, res) => {
  const { period = '30d' } = req.query;
  const data = loadData();
  const transactions = (data.transactions || []).filter(t => t.status === 'completed');

  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const filtered = transactions.filter(t => new Date(t.created_at) >= startDate);

  // Group by day
  const byDay = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    byDay[key] = { date: key, revenue: 0, fees: 0, count: 0 };
  }

  filtered.forEach(t => {
    const key = new Date(t.created_at).toISOString().split('T')[0];
    if (byDay[key]) {
      byDay[key].revenue += (t.total || t.amount || 0);
      byDay[key].fees += (t.beninpay_fee || 0);
      byDay[key].count++;
    }
  });

  const chartData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    period,
    total_revenue: filtered.reduce((sum, t) => sum + (t.total || t.amount || 0), 0),
    total_fees: filtered.reduce((sum, t) => sum + (t.beninpay_fee || 0), 0),
    total_transactions: filtered.length,
    chart: chartData
  });
});

router.get('/operators', auth, (req, res) => {
  const data = loadData();
  const transactions = (data.transactions || []).filter(t => t.status === 'completed');

  const byOperator = {};
  transactions.forEach(t => {
    const op = t.operator || 'unknown';
    if (!byOperator[op]) byOperator[op] = { operator: op, count: 0, volume: 0 };
    byOperator[op].count++;
    byOperator[op].volume += (t.total || t.amount || 0);
  });

  res.json({ operators: Object.values(byOperator) });
});

router.get('/merchants', auth, (req, res) => {
  const data = loadData();
  const merchants = data.merchants || [];
  const transactions = data.transactions || [];

  const merchantStats = merchants.map(m => {
    const txns = transactions.filter(t => t.merchant_id === m.id);
    const completed = txns.filter(t => t.status === 'completed');
    return {
      shop_domain: m.shop_domain,
      plan: m.plan || 'free',
      balance: m.balance || 0,
      transaction_count: completed.length,
      total_volume: completed.reduce((sum, t) => sum + (t.total || 0), 0),
      last_transaction: completed.length > 0
        ? completed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null
    };
  });

  merchantStats.sort((a, b) => b.total_volume - a.total_volume);

  res.json({ merchants: merchantStats });
});

router.get('/overview', auth, (req, res) => {
  const data = loadData();
  const transactions = data.transactions || [];
  const merchants = data.merchants || [];
  const withdrawals = data.withdrawals || [];

  const completed = transactions.filter(t => t.status === 'completed');
  const today = new Date().toISOString().split('T')[0];
  const todayTxns = completed.filter(t => t.created_at && t.created_at.startsWith(today));

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = completed.filter(t => t.created_at && t.created_at.startsWith(thisMonth));

  res.json({
    overview: {
      total_merchants: merchants.length,
      active_merchants: merchants.filter(m => m.status === 'active').length,
      total_transactions: completed.length,
      total_volume: completed.reduce((sum, t) => sum + (t.total || t.amount || 0), 0),
      total_profit: completed.reduce((sum, t) => sum + (t.beninpay_fee || 0), 0),
      pending_withdrawals: withdrawals.filter(w => w.status === 'pending').length,
      today: {
        transactions: todayTxns.length,
        volume: todayTxns.reduce((sum, t) => sum + (t.total || 0), 0),
        profit: todayTxns.reduce((sum, t) => sum + (t.beninpay_fee || 0), 0),
      },
      this_month: {
        transactions: monthTxns.length,
        volume: monthTxns.reduce((sum, t) => sum + (t.total || 0), 0),
        profit: monthTxns.reduce((sum, t) => sum + (t.beninpay_fee || 0), 0),
      }
    }
  });
});

export default router;
