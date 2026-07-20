export function transactionsToCSV(transactions) {
  const headers = ['ID', 'Date', 'Montant (FCFA)', 'Commission', 'Net Marchand', 'Client', 'Email', 'Operateur', 'Statut', 'Commande'];

  const rows = transactions.map(t => [
    t.id,
    new Date(t.created_at).toLocaleDateString('fr-FR'),
    t.amount || t.total || 0,
    t.beninpay_fee || 0,
    t.merchant_amount || 0,
    t.customer_name || '',
    t.customer_email || '',
    t.operator || '',
    t.status || '',
    t.order_id || ''
  ]);

  return formatCSV(headers, rows);
}

export function withdrawalsToCSV(withdrawals) {
  const headers = ['ID', 'Date Demande', 'Montant (FCFA)', 'Operateur', 'Numero', 'Statut', 'Date Traitement', 'Note Admin'];

  const rows = withdrawals.map(w => [
    w.id,
    new Date(w.requested_at).toLocaleDateString('fr-FR'),
    w.amount || 0,
    w.mobile_money_operator || '',
    w.mobile_money_number || '',
    w.status || '',
    w.processed_at ? new Date(w.processed_at).toLocaleDateString('fr-FR') : '',
    w.admin_note || ''
  ]);

  return formatCSV(headers, rows);
}

export function merchantsToCSV(merchants) {
  const headers = ['ID', 'Boutique', 'Plan', 'Solde (FCFA)', 'Total Gagne', 'Total Retire', 'Email', 'Statut', 'Inscription'];

  const rows = merchants.map(m => [
    m.id,
    m.shop_domain || '',
    m.plan || 'free',
    m.balance || 0,
    m.total_earned || 0,
    m.total_withdrawn || 0,
    m.email || '',
    m.status || '',
    m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : ''
  ]);

  return formatCSV(headers, rows);
}

function formatCSV(headers, rows) {
  const escape = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ];

  return '﻿' + lines.join('\r\n');
}
