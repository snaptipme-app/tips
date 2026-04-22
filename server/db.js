const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'snaptip.db');

let db = null;

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      phone_number TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      profile_image_url TEXT DEFAULT '',
      photo_base64 TEXT DEFAULT '',
      email TEXT DEFAULT '',
      password TEXT NOT NULL,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columnMigrations = [
    "ALTER TABLE employees ADD COLUMN first_name TEXT DEFAULT ''",
    "ALTER TABLE employees ADD COLUMN last_name TEXT DEFAULT ''",
    "ALTER TABLE employees ADD COLUMN phone_number TEXT DEFAULT ''",
    "ALTER TABLE employees ADD COLUMN profile_image_url TEXT DEFAULT ''",
    "ALTER TABLE employees ADD COLUMN photo_base64 TEXT DEFAULT ''",
    "ALTER TABLE employees ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN country TEXT DEFAULT 'Morocco'",
    "ALTER TABLE employees ADD COLUMN currency TEXT DEFAULT 'MAD'",
    "ALTER TABLE employees ADD COLUMN is_suspended INTEGER DEFAULT 0",
  ];
  for (const sql of columnMigrations) {
    try { db.run(sql); } catch (_) { /* column already exists */ }
  }

  // Backfill existing accounts with Morocco/MAD
  try { db.run("UPDATE employees SET country = 'Morocco' WHERE country IS NULL OR country = '' OR country = 'undefined'"); } catch (_) {}
  try { db.run("UPDATE employees SET currency = 'MAD' WHERE currency IS NULL OR currency = '' OR currency = 'undefined'"); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT '',
      account_details TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  const withdrawalMigrations = [
    "ALTER TABLE withdrawals ADD COLUMN method TEXT DEFAULT ''",
    "ALTER TABLE withdrawals ADD COLUMN account_details TEXT DEFAULT ''",
    "ALTER TABLE withdrawals ADD COLUMN fee REAL DEFAULT 0",
    "ALTER TABLE withdrawals ADD COLUMN net_amount REAL DEFAULT 0",
    "ALTER TABLE withdrawals ADD COLUMN contact_phone TEXT DEFAULT ''",
  ];
  for (const sql of withdrawalMigrations) {
    try { db.run(sql); } catch (_) { /* column already exists */ }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      expires_at INTEGER NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.run("ALTER TABLE otps ADD COLUMN email TEXT DEFAULT ''");
  } catch (_) { /* already exists */ }

  try {
    db.run("ALTER TABLE employees ADD COLUMN account_type TEXT DEFAULT 'individual'");
  } catch (_) { /* already exists */ }

  try {
    db.run("ALTER TABLE employees ADD COLUMN job_title TEXT DEFAULT ''");
  } catch (_) { /* already exists */ }

  try {
    db.run("ALTER TABLE employees ADD COLUMN business_id INTEGER DEFAULT NULL");
  } catch (_) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  // ── Business Account tables ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES employees(id),
      business_name TEXT NOT NULL,
      business_type TEXT NOT NULL,
      logo_url TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_method TEXT DEFAULT 'mock',
      status TEXT DEFAULT 'completed',
      stripe_payment_id TEXT DEFAULT NULL,
      tourist_email TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add expires_at to invitations
  try {
    db.run("ALTER TABLE invitations ADD COLUMN expires_at DATETIME DEFAULT (datetime('now', '+48 hours'))");
  } catch (_) { /* column already exists */ }

  // Migration: add thank_you_message and logo_base64 to businesses
  try { db.run("ALTER TABLE businesses ADD COLUMN thank_you_message TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE businesses ADD COLUMN logo_base64 TEXT DEFAULT ''"); } catch (_) {}

  // Migration: add withdrawal settings to employees
  try { db.run("ALTER TABLE employees ADD COLUMN withdrawal_method TEXT DEFAULT ''"); } catch (_) {}
  try { db.run("ALTER TABLE employees ADD COLUMN withdrawal_account TEXT DEFAULT ''"); } catch (_) {}

  // Migration: add profile_photo_base64 for direct base64 photo storage
  try { db.run("ALTER TABLE employees ADD COLUMN profile_photo_base64 TEXT DEFAULT ''"); } catch (_) {}

  // ────────────────────────────────────────────────────────────────────

  saveDB();
  console.log('Database initialized (SQLite via sql.js)');
}

function getDB() {
  return db;
}

module.exports = { getDB, initDB, saveDB };
