-- Schema BeninPay - Dashboard Marchands avec Retraits

-- Table des marchands
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT UNIQUE NOT NULL,
    shop_name TEXT,
    email TEXT,
    phone TEXT,
    mobile_money_operator TEXT, -- MTN, Moov, Celtis
    mobile_money_number TEXT,
    balance INTEGER DEFAULT 0, -- Solde en FCFA
    total_earned INTEGER DEFAULT 0, -- Total gagné
    total_withdrawn INTEGER DEFAULT 0, -- Total retiré
    status TEXT DEFAULT 'active', -- active, suspended
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    order_id TEXT NOT NULL,
    fedapay_transaction_id TEXT,
    amount INTEGER NOT NULL, -- Montant produit
    beninpay_fee INTEGER NOT NULL, -- Frais BeninPay
    total INTEGER NOT NULL, -- Total payé par client
    merchant_amount INTEGER NOT NULL, -- Montant pour marchand
    beninpay_profit INTEGER NOT NULL, -- Profit BeninPay
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    fedapay_status TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    payment_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Table des demandes de retrait
CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    amount INTEGER NOT NULL, -- Montant demandé
    fee INTEGER DEFAULT 0, -- Frais de retrait
    net_amount INTEGER NOT NULL, -- Montant net reçu
    mobile_money_operator TEXT NOT NULL,
    mobile_money_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, rejected
    admin_note TEXT,
    fedapay_transfer_id TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Table des logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER,
    action TEXT NOT NULL, -- payment_received, withdrawal_requested, withdrawal_completed, etc.
    description TEXT,
    amount INTEGER,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_merchant ON withdrawals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_logs_merchant ON activity_logs(merchant_id);
