const { db } = require('./db');

const schema = `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    city TEXT,
    total_spend REAL DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    last_purchase TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    product TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT NOT NULL DEFAULT '[]',
    customer_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    segment_id INTEGER REFERENCES segments(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    message_template TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_converted INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,
    confidence_rate INTEGER DEFAULT 85,
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    sent_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    opened_at TEXT,
    read_at TEXT,
    clicked_at TEXT,
    converted_at TEXT,
    conversion_revenue REAL,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

function initializeDatabase() {
  try {
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      db.exec(stmt);
    }

    // Attempt to add confidence_rate column to existing campaigns table if it doesn't exist
    try {
      db.exec("ALTER TABLE campaigns ADD COLUMN confidence_rate INTEGER DEFAULT 85");
      console.log("Database Migration: Added confidence_rate column to campaigns table");
    } catch (err) {
      // Column already exists or table doesn't exist yet (handled by exec(schema))
    }

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_communications_campaign_id ON communications(campaign_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)');

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };
