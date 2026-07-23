/**
 * Store unifie - utilise PostgreSQL si DATABASE_URL est defini, sinon JSON fichier
 */

const USE_PG = !!process.env.DATABASE_URL;

let pgModule = null;
let jsonModule = null;

async function getPg() {
  if (!pgModule) pgModule = await import('./pg-store.js');
  return pgModule;
}

async function getJson() {
  if (!jsonModule) jsonModule = await import('./json-store.js');
  return jsonModule;
}

// ========== INIT ==========
export async function initStore() {
  if (USE_PG) {
    const { initPgDatabase } = await getPg();
    await initPgDatabase();
    console.log('[Store] PostgreSQL mode');
  } else {
    const { initDatabase } = await getJson();
    await initDatabase();
    console.log('[Store] JSON file mode (DATA WILL BE LOST ON REDEPLOY)');
  }
}

// ========== MERCHANTS ==========
export async function getMerchant(shopDomain) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query('SELECT * FROM merchants WHERE shop_domain = $1', [shopDomain]);
    return res.rows[0] || null;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.merchants || []).find(m => m.shop_domain === shopDomain) || null;
}

export async function createMerchant(merchant) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query(
      `INSERT INTO merchants (shop_domain, shop_name, business_name, email, phone, plan, balance, total_earned, total_withdrawn, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (shop_domain) DO NOTHING
       RETURNING *`,
      [merchant.shop_domain, merchant.shop_name || merchant.shop_domain, merchant.business_name || '',
       merchant.email || '', merchant.phone || '', merchant.plan || 'free',
       merchant.balance || 0, merchant.total_earned || 0, merchant.total_withdrawn || 0, merchant.status || 'active']
    );
    return res.rows[0];
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  if (!data.merchants) data.merchants = [];
  const existing = data.merchants.find(m => m.shop_domain === merchant.shop_domain);
  if (existing) return existing;
  const newM = { id: data.merchants.length + 1, ...merchant, created_at: new Date().toISOString() };
  data.merchants.push(newM);
  saveData(data);
  return newM;
}

export async function updateMerchant(shopDomain, updates) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const fields = Object.keys(updates);
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);
    await getPool().query(`UPDATE merchants SET ${sets}, updated_at = NOW() WHERE shop_domain = $1`, [shopDomain, ...values]);
    return;
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  const m = (data.merchants || []).find(m => m.shop_domain === shopDomain);
  if (m) { Object.assign(m, updates); saveData(data); }
}

// ========== ORDERS ==========
export async function createOrder(order) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query(
      `INSERT INTO orders (order_ref, shop_domain, product_title, product_id, variant_id, quantity, amount, original_amount, original_currency, customer_name, customer_phone, customer_email, operator, cart_items, cart_token, status, payment_status, fedapay_transaction_id, payment_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [order.order_ref, order.shop_domain, order.product_title, order.product_id, order.variant_id,
       order.quantity || 1, order.amount, order.original_amount, order.original_currency,
       order.customer_name, order.customer_phone, order.customer_email, order.operator,
       JSON.stringify(order.cart_items || []), order.cart_token,
       order.status || 'pending_payment', order.payment_status || 'pending',
       order.fedapay_transaction_id, order.payment_url]
    );
    return res.rows[0];
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  if (!data.orders) data.orders = [];
  const newO = { id: data.orders.length + 1, ...order, created_at: new Date().toISOString() };
  data.orders.push(newO);
  saveData(data);
  return newO;
}

export async function getOrder(orderRef) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query('SELECT * FROM orders WHERE order_ref = $1', [orderRef]);
    return res.rows[0] || null;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.orders || []).find(o => o.order_ref === orderRef) || null;
}

export async function getOrdersByShop(shopDomain, status) {
  if (USE_PG) {
    const { getPool } = await getPg();
    let q = 'SELECT * FROM orders WHERE shop_domain = $1';
    const params = [shopDomain];
    if (status) { q += ' AND status = $2'; params.push(status); }
    q += ' ORDER BY created_at DESC';
    const res = await getPool().query(q, params);
    return res.rows;
  }
  const { loadData } = await getJson();
  const data = loadData();
  let orders = (data.orders || []).filter(o => o.shop_domain === shopDomain);
  if (status) orders = orders.filter(o => o.status === status);
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return orders;
}

export async function getPendingOrders(shopDomain) {
  if (USE_PG) {
    const { getPool } = await getPg();
    let q = "SELECT * FROM orders WHERE payment_status != 'completed'";
    const params = [];
    if (shopDomain) { q += ' AND shop_domain = $1'; params.push(shopDomain); }
    const res = await getPool().query(q, params);
    return res.rows;
  }
  const { loadData } = await getJson();
  const data = loadData();
  let orders = (data.orders || []).filter(o => o.payment_status !== 'completed');
  if (shopDomain) orders = orders.filter(o => o.shop_domain === shopDomain);
  return orders;
}

export async function updateOrder(orderRef, updates) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const fields = Object.keys(updates);
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);
    await getPool().query(`UPDATE orders SET ${sets} WHERE order_ref = $1`, [orderRef, ...values]);
    return;
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  const o = (data.orders || []).find(o => o.order_ref === orderRef);
  if (o) { Object.assign(o, updates); saveData(data); }
}

export async function findOrderByTxId(txId) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query('SELECT * FROM orders WHERE fedapay_transaction_id = $1', [String(txId)]);
    return res.rows[0] || null;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.orders || []).find(o => String(o.fedapay_transaction_id) === String(txId)) || null;
}

// ========== TRANSACTIONS ==========
export async function createTransaction(txn) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query(
      `INSERT INTO transactions (merchant_id, fedapay_transaction_id, order_id, shop_domain, amount, beninpay_fee, beninpay_profit, merchant_amount, total, status, customer_name, customer_email, operator, product_title)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [txn.merchant_id, txn.fedapay_transaction_id, txn.order_id, txn.shop_domain,
       txn.amount, txn.beninpay_fee, txn.beninpay_profit, txn.merchant_amount, txn.total,
       txn.status || 'completed', txn.customer_name, txn.customer_email, txn.operator, txn.product_title]
    );
    return res.rows[0];
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  if (!data.transactions) data.transactions = [];
  const newT = { id: data.transactions.length + 1, ...txn, created_at: new Date().toISOString() };
  data.transactions.push(newT);
  saveData(data);
  return newT;
}

export async function getTransactionsByMerchant(merchantId) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query('SELECT * FROM transactions WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
    return res.rows;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.transactions || []).filter(t => t.merchant_id === merchantId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function transactionExists(orderRef, txId) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query(
      'SELECT id FROM transactions WHERE order_id = $1 OR fedapay_transaction_id = $2 LIMIT 1',
      [orderRef, txId]
    );
    return res.rows.length > 0;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.transactions || []).some(t => t.order_id === orderRef || t.fedapay_transaction_id === txId);
}

// ========== WITHDRAWALS ==========
export async function createWithdrawal(w) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query(
      `INSERT INTO withdrawals (merchant_id, amount, fee, net_amount, mobile_money_operator, mobile_money_number, status, requested_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [w.merchant_id, w.amount, w.fee, w.net_amount, w.mobile_money_operator, w.mobile_money_number, w.status || 'pending']
    );
    return res.rows[0];
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  if (!data.withdrawals) data.withdrawals = [];
  const newW = { id: data.withdrawals.length + 1, ...w, requested_at: new Date().toISOString(), created_at: new Date().toISOString() };
  data.withdrawals.push(newW);
  saveData(data);
  return newW;
}

export async function getWithdrawalsByMerchant(merchantId) {
  if (USE_PG) {
    const { getPool } = await getPg();
    const res = await getPool().query('SELECT * FROM withdrawals WHERE merchant_id = $1 ORDER BY requested_at DESC', [merchantId]);
    return res.rows;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.withdrawals || []).filter(w => w.merchant_id === merchantId)
    .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
}

// ========== WEBHOOK EVENTS ==========
export async function logWebhookEvent(source, eventType, payload) {
  if (USE_PG) {
    const { getPool } = await getPg();
    await getPool().query(
      'INSERT INTO webhook_events (source, event_type, payload, status) VALUES ($1,$2,$3,$4)',
      [source, eventType, typeof payload === 'string' ? payload : JSON.stringify(payload), 'received']
    );
    return;
  }
  const { loadData, saveData } = await getJson();
  const data = loadData();
  if (!data.webhook_events) data.webhook_events = [];
  data.webhook_events.push({ id: data.webhook_events.length + 1, source, event_type: eventType, payload: JSON.stringify(payload), status: 'received', created_at: new Date().toISOString() });
  saveData(data);
}

// ========== HELPER: find merchant flexible ==========
export async function findMerchantFlexible(shopDomain) {
  if (!shopDomain) return null;
  if (USE_PG) {
    const { getPool } = await getPg();
    let res = await getPool().query('SELECT * FROM merchants WHERE shop_domain = $1', [shopDomain]);
    if (res.rows[0]) return res.rows[0];
    const prefix = shopDomain.split('.')[0];
    res = await getPool().query('SELECT * FROM merchants WHERE shop_domain LIKE $1', [`%${prefix}%`]);
    return res.rows[0] || null;
  }
  const { loadData } = await getJson();
  const data = loadData();
  return (data.merchants || []).find(m =>
    m.shop_domain === shopDomain ||
    shopDomain.includes(m.shop_domain?.split('.')[0]) ||
    m.shop_domain?.includes(shopDomain.split('.')[0])
  ) || null;
}
