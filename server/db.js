const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    // pgcrypto is required for field-level encryption (see lib/cryptoFields.js).
    // CREATE EXTENSION needs superuser; if the application role isn't allowed
    // to run it the call errors out and we silently skip — the DBA must run
    // `CREATE EXTENSION pgcrypto;` once as superuser. See docs/db-hardening.md.
    try { await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto'); }
    catch (e) { console.warn('[db] pgcrypto extension not created (may need superuser):', e.message); }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        full_name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        username TEXT UNIQUE,
        photo_url TEXT,
        job_title TEXT,
        account_type TEXT DEFAULT 'individual',
        country TEXT DEFAULT 'Morocco',
        currency TEXT DEFAULT 'MAD',
        balance REAL DEFAULT 0,
        total_tips REAL DEFAULT 0,
        otp_code TEXT,
        otp_expires BIGINT,
        is_verified INTEGER DEFAULT 0,
        is_suspended INTEGER DEFAULT 0,
        last_login TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES employees(id),
        business_name TEXT,
        business_type TEXT,
        logo_url TEXT,
        address TEXT,
        thank_you_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id),
        employee_id INTEGER REFERENCES employees(id),
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id),
        email TEXT,
        token TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        expires_at BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        amount REAL,
        fee REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        payment_method TEXT DEFAULT 'mock',
        stripe_payment_id TEXT,
        tourist_email TEXT,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        amount REAL,
        fee REAL DEFAULT 0,
        net_amount REAL,
        method TEXT,
        account_details TEXT,
        contact_phone TEXT,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tips (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        amount REAL,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email TEXT,
        otp_hash TEXT,
        attempts INTEGER DEFAULT 0,
        expires_at BIGINT,
        verified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        event TEXT,
        amount REAL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Append-only log of security-relevant actions. See lib/audit.js for the
    // call sites and docs/db-hardening.md for retention guidance.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        actor_type TEXT,
        actor_id INTEGER,
        action TEXT,
        target_type TEXT,
        target_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Hot indexes — recent activity queries scan by created_at; investigation
    // queries filter by actor or action.
    try { await pool.query('CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC)'); } catch (_) {}
    try { await pool.query('CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action)'); } catch (_) {}
    try { await pool.query('CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_type, actor_id)'); } catch (_) {}

    // ── Employee column migrations (idempotent) ──
    const employeeAlterTables = [
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image_url TEXT DEFAULT ''",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_base64 TEXT DEFAULT ''",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT ''",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_id INTEGER",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS withdrawal_method TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS withdrawal_account TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo_base64 TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Morocco'",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS custom_message TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS show_photo_on_card INTEGER DEFAULT 1",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_code TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS reset_code_expires BIGINT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS stripe_account_id TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS payout_method TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS payout_country TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS payout_onboarding_status TEXT",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS minimum_withdrawal_amount NUMERIC(12,2)",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'manual'",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT false",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS next_payout_at TIMESTAMP",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_auto_payout_at TIMESTAMP",
      // Phase 6.1 — GDPR soft-delete. NULL = active. Set to NOW() on delete-account;
      // hard-purged after 30 days by scripts/purge-deleted-accounts.js.
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",
      "ALTER TABLE employees ADD COLUMN IF NOT EXISTS deletion_recovery_code TEXT",
    ];
    for (const ddl of employeeAlterTables) {
      try { await pool.query(ddl); } catch (e) { /* already exists */ }
    }

    // ── Business column migrations ──
    const businessAlterTables = [
      "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_base64 TEXT",
    ];
    for (const ddl of businessAlterTables) {
      try { await pool.query(ddl); } catch (e) { }
    }

    // ── Payments, Withdrawals, Tips & Invitations migrations ──
    const otherAlterTables = [
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC(5,2) DEFAULT 10",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_currency TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_currency TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_amount NUMERIC(18,0)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18,8)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS employee_balance_currency TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_platform_received_amount NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending'",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS available_on TIMESTAMP",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_available_for_employee NUMERIC(12,2)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_withdrawn_from_this_payment NUMERIC(12,2) DEFAULT 0",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS business_id INTEGER",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_method TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS contact_phone TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_amount REAL",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS gross_requested_amount NUMERIC(12,2)",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2)",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC(5,2) DEFAULT 10",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_payout_amount NUMERIC(12,2)",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_method TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_status TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_schedule TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS platform_fee_snapshot NUMERIC(5,2)",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS stripe_account_id TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key TEXT",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_details TEXT",
      // Phase 4.2: encrypted IBAN/RIB/wallet identifiers (see lib/cryptoFields.js).
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS account_details_enc BYTEA",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS withdrawal_source TEXT DEFAULT 'manual'",
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS schedule_period_key TEXT",
      "ALTER TABLE tips ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD'",
      "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS required_country TEXT",
      "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES employees(id)",
      "ALTER TABLE payments ADD COLUMN IF NOT EXISTS rating INTEGER",
      // balance_deducted tracks whether the withdrawal amount has been held from the employee's
      // balance. TRUE = balance already reduced. FALSE = legacy rows that still need
      // deduction when admin approves. New rows are inserted with TRUE.
      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_deducted BOOLEAN DEFAULT TRUE",
      "CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_idempotency_key_unique ON withdrawals(idempotency_key) WHERE idempotency_key IS NOT NULL",
      "CREATE INDEX IF NOT EXISTS withdrawals_schedule_lookup_idx ON withdrawals(employee_id, withdrawal_source, schedule_period_key)",
    ];
    for (const ddl of otherAlterTables) {
      try { await pool.query(ddl); } catch (e) { /* column already exists */ }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_payment_allocations (
        id SERIAL PRIMARY KEY,
        withdrawal_id INTEGER REFERENCES withdrawals(id),
        payment_id INTEGER REFERENCES payments(id),
        employee_id INTEGER REFERENCES employees(id),
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        released_at TIMESTAMP,
        UNIQUE(withdrawal_id, payment_id)
      )
    `);
    try { await pool.query('CREATE INDEX IF NOT EXISTS withdrawal_payment_allocations_employee_idx ON withdrawal_payment_allocations(employee_id)'); } catch (_) {}
    try { await pool.query('CREATE INDEX IF NOT EXISTS payments_employee_settlement_idx ON payments(employee_id, settlement_status, currency)'); } catch (_) {}

    // Sync is_valid for pre-existing rows that were accepted or expired
    try {
      await pool.query("UPDATE invitations SET is_valid = FALSE WHERE status IN ('accepted','expired') AND is_valid = TRUE");
    } catch (_) {}

    // Default settings
    await pool.query("UPDATE employees SET country = 'Morocco' WHERE country IS NULL");
    await pool.query("UPDATE employees SET currency = 'MAD' WHERE currency IS NULL");
    await pool.query("UPDATE employees SET payout_schedule = 'manual' WHERE payout_schedule IS NULL OR payout_schedule NOT IN ('manual','weekly','monthly')");
    await pool.query("UPDATE employees SET auto_payout_enabled = false WHERE auto_payout_enabled IS NULL");

    console.log('PostgreSQL Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

function getDB() {
  return pool;
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { getDB, initDB, query, pool };
