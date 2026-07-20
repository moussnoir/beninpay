import express from 'express';
import { loadData } from '../../db/json-store.js';
import { transactionsToCSV, withdrawalsToCSV, merchantsToCSV } from '../services/csv-export.service.js';

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'beninpay2026';

const auth = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/transactions', auth, (req, res) => {
  const { shop, status, from, to } = req.query;
  const data = loadData();
  let transactions = data.transactions || [];

  if (shop) {
    const merchant = data.merchants.find(m => m.shop_domain === shop);
    if (merchant) {
      transactions = transactions.filter(t => t.merchant_id === merchant.id);
    }
  }
  if (status) {
    transactions = transactions.filter(t => t.status === status);
  }
  if (from) {
    transactions = transactions.filter(t => new Date(t.created_at) >= new Date(from));
  }
  if (to) {
    transactions = transactions.filter(t => new Date(t.created_at) <= new Date(to));
  }

  const csv = transactionsToCSV(transactions);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=beninpay-transactions-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

router.get('/withdrawals', auth, (req, res) => {
  const { status, from, to } = req.query;
  const data = loadData();
  let withdrawals = data.withdrawals || [];

  if (status) {
    withdrawals = withdrawals.filter(w => w.status === status);
  }
  if (from) {
    withdrawals = withdrawals.filter(w => new Date(w.requested_at) >= new Date(from));
  }
  if (to) {
    withdrawals = withdrawals.filter(w => new Date(w.requested_at) <= new Date(to));
  }

  const csv = withdrawalsToCSV(withdrawals);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=beninpay-withdrawals-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

router.get('/merchants', auth, (req, res) => {
  const data = loadData();
  const merchants = data.merchants || [];

  const csv = merchantsToCSV(merchants);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=beninpay-merchants-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

export default router;
