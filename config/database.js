import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export async function initPostgres() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id SERIAL PRIMARY KEY,
        shop_domain VARCHAR(255) UNIQUE NOT NULL,
        shop_name VARCHAR(255),
        access_token TEXT,
        plan VARCHAR(50) DEFAULT 'free',
        balance DECIMAL(12,2) DEFAULT 0,
        total_earned DECIMAL(12,2) DEFAULT 0,
        total_withdrawn DECIMAL(12,2) DEFAULT 0,
        email VARCHAR(255),
        phone VARCHAR(50),
        mobile_money_operator VARCHAR(50),
        mobile_money_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER REFERENCES merchants(id),
        fedapay_transaction_id VARCHAR(255),
        order_id VARCHAR(255),
        amount DECIMAL(12,2) NOT NULL,
        beninpay_fee DECIMAL(12,2) DEFAULT 0,
        merchant_amount DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'XOF',
        status VARCHAR(50) DEFAULT 'pending',
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        operator VARCHAR(50),
        payment_url TEXT,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER REFERENCES merchants(id),
        amount DECIMAL(12,2) NOT NULL,
        fee DECIMAL(12,2) DEFAULT 0,
        net_amount DECIMAL(12,2) NOT NULL,
        mobile_money_operator VARCHAR(50),
        mobile_money_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        admin_note TEXT,
        fedapay_transfer_id VARCHAR(255),
        requested_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER,
        action VARCHAR(100),
        description TEXT,
        amount DECIMAL(12,2),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        event_type VARCHAR(100),
        payload JSONB,
        status VARCHAR(50) DEFAULT 'received',
        processed_at TIMESTAMP,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER REFERENCES merchants(id),
        type VARCHAR(50),
        channel VARCHAR(50),
        recipient VARCHAR(255),
        subject TEXT,
        body TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_merchant ON withdrawals(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_merchant ON activity_logs(merchant_id);
    `);
    console.log('[DB] PostgreSQL tables initialized');
  } finally {
    client.release();
  }
}

export { pool };
export default pool;
