/**
 * Admin Panel - Gérer les retraits
 */

const express = require('express');
const router = express.Router();
const { query, run, get } = require('../../db/init');

// Protection admin (simple pour MVP)
const ADMIN_PASSWORD = 'beninpay2026'; // TODO: Changer et sécuriser

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${ADMIN_PASSWORD}` || req.query.admin === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
}

// Page admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const pendingWithdrawals = await query(`
      SELECT w.*, m.shop_name, m.email
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status = 'pending'
      ORDER BY w.requested_at DESC
    `);

    const processingWithdrawals = await query(`
      SELECT w.*, m.shop_name
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status = 'processing'
      ORDER BY w.requested_at DESC
    `);

    const recentCompleted = await query(`
      SELECT w.*, m.shop_name
      FROM withdrawals w
      JOIN merchants m ON w.merchant_id = m.id
      WHERE w.status IN ('completed', 'rejected')
      ORDER BY w.completed_at DESC
      LIMIT 20
    `);

    const stats = await get(`
      SELECT
        COUNT(*) as total_withdrawals,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount
      FROM withdrawals
    `);

    res.send(renderAdmin(pendingWithdrawals, processingWithdrawals, recentCompleted, stats));

  } catch (error) {
    console.error('[Admin] Erreur:', error);
    res.status(500).send('Erreur serveur');
  }
});

// API: Approuver retrait
router.post('/admin/api/withdrawals/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await get('SELECT * FROM withdrawals WHERE id = ?', [id]);

    if (!withdrawal) {
      return res.status(404).json({ success: false, error: 'Retrait non trouvé' });
    }

    // Mettre en processing
    await run(`
      UPDATE withdrawals
      SET status = 'processing', processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({ success: true });

  } catch (error) {
    console.error('[Admin] Erreur approve:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// API: Marquer comme complété
router.post('/admin/api/withdrawals/:id/complete', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fedapay_transfer_id, admin_note } = req.body;

    const withdrawal = await get('SELECT * FROM withdrawals WHERE id = ?', [id]);

    if (!withdrawal) {
      return res.status(404).json({ success: false, error: 'Retrait non trouvé' });
    }

    // Marquer complété
    await run(`
      UPDATE withdrawals
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          fedapay_transfer_id = ?,
          admin_note = ?
      WHERE id = ?
    `, [fedapay_transfer_id, admin_note, id]);

    // Déduire du solde marchand
    await run(`
      UPDATE merchants
      SET balance = balance - ?,
          total_withdrawn = total_withdrawn + ?
      WHERE id = ?
    `, [withdrawal.amount, withdrawal.amount, withdrawal.merchant_id]);

    // Log
    await run(`
      INSERT INTO activity_logs (merchant_id, action, description, amount)
      VALUES (?, 'withdrawal_completed', 'Retrait complété', ?)
    `, [withdrawal.merchant_id, withdrawal.amount]);

    res.json({ success: true });

  } catch (error) {
    console.error('[Admin] Erreur complete:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// API: Rejeter retrait
router.post('/admin/api/withdrawals/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await run(`
      UPDATE withdrawals
      SET status = 'rejected',
          completed_at = CURRENT_TIMESTAMP,
          admin_note = ?
      WHERE id = ?
    `, [reason, id]);

    res.json({ success: true });

  } catch (error) {
    console.error('[Admin] Erreur reject:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

function renderAdmin(pending, processing, recent, stats) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BeninPay Admin - Gestion Retraits</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  padding: 20px;
}
.header {
  background: linear-gradient(135deg, #e8112d, #ff4444);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
}
.header h1 {
  font-size: 28px;
  margin-bottom: 5px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}
.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #e8112d;
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
  margin-bottom: 15px;
  color: #333;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  background: #f8f9fa;
  padding: 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}
td {
  padding: 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-right: 5px;
}
.btn-approve {
  background: #4caf50;
  color: white;
}
.btn-reject {
  background: #f44336;
  color: white;
}
.btn-complete {
  background: #2196f3;
  color: white;
}
.status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-pending { background: #fff3e0; color: #f57c00; }
.status-processing { background: #e3f2fd; color: #1976d2; }
.status-completed { background: #e8f5e9; color: #2e7d32; }
.status-rejected { background: #ffebee; color: #c62828; }
</style>
</head>
<body>

<div class="header">
  <h1>🔐 BeninPay Admin</h1>
  <div>Gestion des retraits marchands</div>
</div>

<div class="stats">
  <div class="stat-card">
    <div class="stat-label">En attente</div>
    <div class="stat-value">${(stats.pending_amount || 0).toLocaleString()} FCFA</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Complétés</div>
    <div class="stat-value">${(stats.completed_amount || 0).toLocaleString()} FCFA</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Total retraits</div>
    <div class="stat-value">${stats.total_withdrawals || 0}</div>
  </div>
</div>

${pending.length > 0 ? `
<div class="section">
  <div class="section-title">⏳ Demandes en attente (${pending.length})</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Marchand</th>
        <th>Montant</th>
        <th>Frais</th>
        <th>Net</th>
        <th>Opérateur</th>
        <th>Numéro</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${pending.map(w => `
        <tr id="row-${w.id}">
          <td>${new Date(w.requested_at).toLocaleString('fr-FR')}</td>
          <td><strong>${w.shop_name}</strong><br><small>${w.email}</small></td>
          <td>${w.amount.toLocaleString()} FCFA</td>
          <td>${w.fee.toLocaleString()} FCFA</td>
          <td><strong>${w.net_amount.toLocaleString()} FCFA</strong></td>
          <td>${w.mobile_money_operator}</td>
          <td>${w.mobile_money_number}</td>
          <td>
            <button class="btn btn-approve" onclick="approveWithdrawal(${w.id})">✅ Approuver</button>
            <button class="btn btn-reject" onclick="rejectWithdrawal(${w.id})">❌ Rejeter</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : '<div class="section">✅ Aucune demande en attente</div>'}

${processing.length > 0 ? `
<div class="section">
  <div class="section-title">⚙️ En cours de traitement (${processing.length})</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Marchand</th>
        <th>Montant</th>
        <th>Net</th>
        <th>Opérateur</th>
        <th>Numéro</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${processing.map(w => `
        <tr id="row-${w.id}">
          <td>${new Date(w.requested_at).toLocaleString('fr-FR')}</td>
          <td><strong>${w.shop_name}</strong></td>
          <td>${w.amount.toLocaleString()} FCFA</td>
          <td><strong>${w.net_amount.toLocaleString()} FCFA</strong></td>
          <td>${w.mobile_money_operator}</td>
          <td>${w.mobile_money_number}</td>
          <td>
            <button class="btn btn-complete" onclick="completeWithdrawal(${w.id})">✅ Marquer complété</button>
            <button class="btn btn-reject" onclick="rejectWithdrawal(${w.id})">❌ Annuler</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : ''}

${recent.length > 0 ? `
<div class="section">
  <div class="section-title">📋 Historique récent</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Marchand</th>
        <th>Montant</th>
        <th>Net</th>
        <th>Status</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${recent.map(w => `
        <tr>
          <td>${new Date(w.completed_at || w.requested_at).toLocaleString('fr-FR')}</td>
          <td>${w.shop_name}</td>
          <td>${w.amount.toLocaleString()} FCFA</td>
          <td>${w.net_amount.toLocaleString()} FCFA</td>
          <td><span class="status status-${w.status}">${w.status}</span></td>
          <td><small>${w.admin_note || '-'}</small></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>
` : ''}

<script>
const ADMIN_TOKEN = '${ADMIN_PASSWORD}';

async function approveWithdrawal(id) {
  if (!confirm('Approuver ce retrait?')) return;

  try {
    const response = await fetch(\`/admin/api/withdrawals/\${id}/approve\`, {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${ADMIN_TOKEN}\` }
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Retrait approuvé! Passé en traitement.');
      location.reload();
    } else {
      alert('❌ Erreur: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erreur réseau');
  }
}

async function completeWithdrawal(id) {
  const transferId = prompt('ID transaction FedaPay (optionnel):');
  const note = prompt('Note (optionnel):');

  if (!confirm('Marquer ce retrait comme complété?')) return;

  try {
    const response = await fetch(\`/admin/api/withdrawals/\${id}/complete\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${ADMIN_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fedapay_transfer_id: transferId,
        admin_note: note
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Retrait complété! Le solde du marchand a été débité.');
      location.reload();
    } else {
      alert('❌ Erreur: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erreur réseau');
  }
}

async function rejectWithdrawal(id) {
  const reason = prompt('Raison du rejet:');
  if (!reason) return;

  try {
    const response = await fetch(\`/admin/api/withdrawals/\${id}/reject\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${ADMIN_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Retrait rejeté.');
      location.reload();
    } else {
      alert('❌ Erreur: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erreur réseau');
  }
}

// Auto-refresh toutes les 30 secondes
setTimeout(() => location.reload(), 30000);
</script>

</body>
</html>`;
}

module.exports = router;
