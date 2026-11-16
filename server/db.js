import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'tx.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    hash       TEXT NOT NULL UNIQUE,
    ts         TEXT,
    from_addr  TEXT,
    to_addr    TEXT,
    amount     REAL NOT NULL DEFAULT 0,
    fee        REAL NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'confirmed',
    block      INTEGER,
    source     TEXT NOT NULL DEFAULT 'import',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_ts ON transactions(ts);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
`);

export function isEmpty() {
  return db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c === 0;
}

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO transactions
    (hash, ts, from_addr, to_addr, amount, fee, status, block, source, created_at)
  VALUES
    (@hash, @ts, @from_addr, @to_addr, @amount, @fee, @status, @block, @source, @created_at)
`);

const insertMany = db.transaction((rows, source) => {
  const now = new Date().toISOString();
  let imported = 0;
  for (const row of rows) {
    const info = insertStmt.run({ ...row, source, created_at: now });
    imported += info.changes;
  }
  return imported;
});

/** Inserts rows, ignoring hashes that already exist. Returns the inserted count. */
export function insertTransactions(rows, source = 'import') {
  return insertMany(rows, source);
}
