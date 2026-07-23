import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5
    });
  }
  return pool;
}

export async function initPgDatabase() {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id SERIAL PRIMARY KEY,
      shop_domain TEXT UNIQUE,
      shop_name TEXT,
      business_name TEXT,
      email TEXT,
      phone TEXT,
      plan TEXT DEFAULT 'free',
      mobile_money_operator TEXT,
      mobile_money_number TEXT,
      balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      total_withdrawn INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      access_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_ref TEXT UNIQUE,
      shop_domain TEXT,
      product_title TEXT,
      product_id TEXT,
      variant_id TEXT,
      quantity INTEGER DEFAULT 1,
      amount INTEGER DEFAULT 0,
      original_amount REAL,
      original_currency TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      operator TEXT,
      cart_items JSONB DEFAULT '[]',
      cart_token TEXT,
      status TEXT DEFAULT 'pending_payment',
      payment_status TEXT DEFAULT 'pending',
      fedapay_transaction_id TEXT,
      payment_url TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER REFERENCES merchants(id),
      fedapay_transaction_id TEXT,
      order_id TEXT,
      shop_domain TEXT,
      amount INTEGER DEFAULT 0,
      beninpay_fee INTEGER DEFAULT 0,
      beninpay_profit INTEGER DEFAULT 0,
      merchant_amount INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      customer_name TEXT,
      customer_email TEXT,
      operator TEXT,
      product_title TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER REFERENCES merchants(id),
      amount INTEGER DEFAULT 0,
      fee INTEGER DEFAULT 0,
      net_amount INTEGER DEFAULT 0,
      mobile_money_operator TEXT,
      mobile_money_number TEXT,
      status TEXT DEFAULT 'pending',
      requested_at TIMESTAMP DEFAULT NOW(),
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      source TEXT,
      event_type TEXT,
      payload TEXT,
      status TEXT DEFAULT 'received',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER,
      action TEXT,
      description TEXT,
      amount INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('[DB] PostgreSQL tables initialized');
}
