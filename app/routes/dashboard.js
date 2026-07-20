/**
 * Dashboard Marchand - Routes
 */

const express = require('express');
const router = express.Router();
const { query, run, get } = require('../../db/init');

// Page dashboard principale
router.get('/dashboard', async (req, res) => {
  try {
    // TODO: Récupérer merchant_id depuis session Shopify
    const merchantId = 1; // Temporaire

    // Récupérer infos marchand
    const merchant = await get('SELECT * FROM merchants WHERE id = ?', [merchantId]);

    if (!merchant) {
      return res.status(404).send('Marchand non trouvé');
    }

    // Stats
    const stats = await get(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN merchant_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN status = 'pending' THEN merchant_amount ELSE 0 END) as pending_amount
      FROM transactions
      WHERE merchant_id = ?
    `, [merchantId]);

    const pendingWithdrawals = await query(`
      SELECT * FROM withdrawals
      WHERE merchant_id = ? AND status = 'pending'
      ORDER BY requested_at DESC
    `, [merchantId]);

    const recentTransactions = await query(`
      SELECT * FROM transactions
      WHERE merchant_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [merchantId]);

    // Render HTML dashboard
    res.send(renderDashboard(merchant, stats, pendingWithdrawals, recentTransactions));

  } catch (error) {
    console.error('[Dashboard] Erreur:', error);
    res.status(500).send('Erreur serveur');
  }
});

// API: Demander retrait
router.post('/api/withdrawals/request', async (req, res) => {
  try {
    const merchantId = 1; // TODO: Session
    const { amount, mobile_money_operator, mobile_money_number } = req.body;

    // Validation
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Montant minimum: 1000 FCFA'
      });
    }

    if (!mobile_money_operator || !mobile_money_number) {
      return res.status(400).json({
        success: false,
        error: 'Opérateur et numéro requis'
      });
    }

    // Vérifier solde
    const merchant = await get('SELECT balance FROM merchants WHERE id = ?', [merchantId]);

    if (merchant.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Solde insuffisant'
      });
    }

    // Calculer frais (2%)
    const fee = Math.round(amount * 0.02);
    const netAmount = amount - fee;

    // Créer demande
    const result = await run(`
      INSERT INTO withdrawals (
        merchant_id, amount, fee, net_amount,
        mobile_money_operator, mobile_money_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [merchantId, amount, fee, netAmount, mobile_money_operator, mobile_money_number]);

    // Log
    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, 'withdrawal_requested', 'Demande de retrait', ?)
    `, [merchantId, amount]);

    res.json({
      success: true,
      withdrawalId: result.id,
      netAmount: netAmount,
      fee: fee
    });

  } catch (error) {
    console.error('[Withdrawal] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// API: Historique retraits
router.get('/api/withdrawals', async (req, res) => {
  try {
    const merchantId = 1; // TODO: Session

    const withdrawals = await query(`
      SELECT * FROM withdrawals
      WHERE merchant_id = ?
      ORDER BY requested_at DESC
    `, [merchantId]);

    res.json({ success: true, withdrawals });

  } catch (error) {
    console.error('[Withdrawals] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// API: Stats
router.get('/api/stats', async (req, res) => {
  try {
    const merchantId = 1; // TODO: Session

    const stats = await get(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN merchant_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN status = 'completed' THEN beninpay_profit ELSE 0 END) as total_fees
      FROM transactions
      WHERE merchant_id = ?
    `, [merchantId]);

    const merchant = await get('SELECT balance, total_withdrawn FROM merchants WHERE id = ?', [merchantId]);

    res.json({
      success: true,
      stats: {
        ...stats,
        balance: merchant.balance,
        total_withdrawn: merchant.total_withdrawn
      }
    });

  } catch (error) {
    console.error('[Stats] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Render HTML dashboard
function renderDashboard(merchant, stats, withdrawals, transactions) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BeninPay Dashboard - ${merchant.shop_name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  padding: 20px;
}
.header {
  background: linear-gradient(135deg, #008751, #00a65e);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
}
.header h1 {
  font-size: 28px;
  margin-bottom: 5px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.stat-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #008751;
}
.section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #333;
}
.btn {
  background: linear-gradient(135deg, #008751, #00a65e);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,135,81,0.3);
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}
td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
.status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.status-completed { background: #e8f5e9; color: #2e7d32; }
.status-pending { background: #fff3e0; color: #f57c00; }
.status-failed { background: #ffebee; color: #c62828; }
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal.active {
  display: flex;
}
.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
}
</style>
</head>
<body>

<div class="header">
  <h1>🇧🇯 BeninPay Dashboard</h1>
  <div>${merchant.shop_name}</div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">Solde disponible</div>
    <div class="stat-value">${merchant.balance.toLocaleString()} FCFA</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Total gagné</div>
    <div class="stat-value">${(stats.total_earned || 0).toLocaleString()} FCFA</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">En attente</div>
    <div class="stat-value">${(stats.pending_amount || 0).toLocaleString()} FCFA</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Transactions</div>
    <div class="stat-value">${stats.total_transactions || 0}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Retirer mes fonds</div>
  <button class="btn" onclick="openWithdrawal()">💰 Demander un retrait</button>
</div>

${withdrawals.length > 0 ? `
<div class="section">
  <div class="section-title">Demandes de retrait en cours</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Montant</th>
        <th>Frais</th>
        <th>Net</th>
        <th>Opérateur</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${withdrawals.map(w => `
        <tr>
          <td>${new Date(w.requested_at).toLocaleDateString('fr-FR')}</td>
          <td>${w.amount.toLocaleString()} FCFA</td>
          <td>${w.fee.toLocaleString()} FCFA</td>
          <td><strong>${w.net_amount.toLocaleString()} FCFA</strong></td>
          <td>${w.mobile_money_operator}</td>
          <td><span class="status status-${w.status}">${w.status}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : ''}

<div class="section">
  <div class="section-title">Transactions récentes</div>
  ${transactions.length === 0 ? '<p>Aucune transaction pour le moment</p>' : `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Commande</th>
          <th>Client</th>
          <th>Total</th>
          <th>Votre part</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(t => `
          <tr>
            <td>${new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
            <td>${t.order_id}</td>
            <td>${t.customer_name || '-'}</td>
            <td>${t.total.toLocaleString()} FCFA</td>
            <td><strong>${t.merchant_amount.toLocaleString()} FCFA</strong></td>
            <td><span class="status status-${t.status}">${t.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `}
</div>

<!-- Modal retrait -->
<div class="modal" id="withdrawalModal">
  <div class="modal-content">
    <h2 style="margin-bottom: 20px;">Demander un retrait</h2>

    <div class="form-group">
      <label>Montant à retirer</label>
      <input type="number" id="amount" placeholder="1000" min="1000" max="${merchant.balance}">
      <small style="color: #666;">Disponible: ${merchant.balance.toLocaleString()} FCFA | Minimum: 1,000 FCFA</small>
    </div>

    <div class="form-group">
      <label>Opérateur Mobile Money</label>
      <select id="operator">
        <option value="MTN">MTN Mobile Money</option>
        <option value="Moov">Moov Money</option>
        <option value="Celtis">Celtis Cash</option>
      </select>
    </div>

    <div class="form-group">
      <label>Numéro Mobile Money</label>
      <input type="tel" id="phone" placeholder="+229 XX XX XX XX" value="${merchant.mobile_money_number || ''}">
    </div>

    <div style="margin: 15px 0; padding: 15px; background: #fff3e0; border-radius: 8px; font-size: 13px;">
      <strong>Frais de retrait: 2%</strong><br>
      Vous recevrez le montant net après déduction des frais.
    </div>

    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button class="btn" onclick="submitWithdrawal()">Confirmer</button>
      <button class="btn" style="background: #666;" onclick="closeWithdrawal()">Annuler</button>
    </div>

    <div id="withdrawalResult" style="margin-top: 15px;"></div>
  </div>
</div>

<script>
function openWithdrawal() {
  document.getElementById('withdrawalModal').classList.add('active');
}

function closeWithdrawal() {
  document.getElementById('withdrawalModal').classList.remove('active');
}

async function submitWithdrawal() {
  const amount = parseInt(document.getElementById('amount').value);
  const operator = document.getElementById('operator').value;
  const phone = document.getElementById('phone').value;

  if (!amount || amount < 1000) {
    alert('Montant minimum: 1000 FCFA');
    return;
  }

  if (!phone) {
    alert('Numéro requis');
    return;
  }

  try {
    const response = await fetch('/api/withdrawals/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        mobile_money_operator: operator,
        mobile_money_number: phone
      })
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('withdrawalResult').innerHTML =
        '<div style="color: green; font-weight: 600;">✅ Demande envoyée! Vous recevrez ' +
        data.netAmount.toLocaleString() + ' FCFA</div>';

      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      document.getElementById('withdrawalResult').innerHTML =
        '<div style="color: red;">❌ ' + data.error + '</div>';
    }
  } catch (error) {
    document.getElementById('withdrawalResult').innerHTML =
      '<div style="color: red;">❌ Erreur réseau</div>';
  }
}
</script>

</body>
</html>`;
}

module.exports = router;
