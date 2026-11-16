import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { COINS, serversFor } from './coins.js';
import { hashPassword } from './passwords.js';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cloverpool.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    email              TEXT NOT NULL UNIQUE,
    name               TEXT NOT NULL,
    password_hash      TEXT NOT NULL,
    alert_enabled      INTEGER NOT NULL DEFAULT 1,
    alert_hashrate_hs  REAL NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coins (
    symbol         TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    algorithm      TEXT NOT NULL,
    payment        TEXT NOT NULL,
    fee            REAL NOT NULL,
    threshold      REAL NOT NULL,
    price_usd      REAL NOT NULL,
    pool_hashrate  REAL NOT NULL,
    network_hashrate REAL NOT NULL,
    miners         INTEGER NOT NULL,
    blocks_24h     INTEGER NOT NULL,
    reward_per_block REAL NOT NULL,
    revenue_unit   TEXT NOT NULL,
    revenue_usd_day REAL NOT NULL,
    merged         TEXT,
    sort_order     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS servers (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol    TEXT NOT NULL REFERENCES coins(symbol) ON DELETE CASCADE,
    region    TEXT NOT NULL,
    host      TEXT NOT NULL,
    port      INTEGER NOT NULL,
    priority  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hashrate_series (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol   TEXT NOT NULL REFERENCES coins(symbol) ON DELETE CASCADE,
    ts       INTEGER NOT NULL,
    hashrate REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_series_symbol_ts ON hashrate_series(symbol, ts);

  CREATE TABLE IF NOT EXISTS blocks (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol   TEXT NOT NULL REFERENCES coins(symbol) ON DELETE CASCADE,
    height   INTEGER NOT NULL,
    hash     TEXT NOT NULL,
    reward   REAL NOT NULL,
    found_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_blocks_found ON blocks(found_at DESC);

  CREATE TABLE IF NOT EXISTS subaccounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puid       INTEGER NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    subaccount_id INTEGER NOT NULL REFERENCES subaccounts(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    symbol        TEXT NOT NULL REFERENCES coins(symbol),
    hashrate      REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'offline',
    last_share_at TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol     TEXT NOT NULL,
    address    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, symbol)
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol     TEXT NOT NULL,
    amount     REAL NOT NULL,
    usd        REAL NOT NULL,
    address    TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    tx_hash    TEXT,
    created_at TEXT NOT NULL
  );
`);

/* ---------------------------------------------------------------- seeding */

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const seedCoin = db.prepare(`
  INSERT INTO coins (symbol, name, algorithm, payment, fee, threshold, price_usd,
    pool_hashrate, network_hashrate, miners, blocks_24h, reward_per_block,
    revenue_unit, revenue_usd_day, merged, sort_order)
  VALUES (@symbol, @name, @algorithm, @payment, @fee, @threshold, @priceUsd,
    @poolHashrate, @networkHashrate, @miners, @blocks24h, @rewardPerBlock,
    @revenueUnit, @revenueUsdPerDay, @merged, @sortOrder)
  ON CONFLICT(symbol) DO UPDATE SET
    name = excluded.name,
    algorithm = excluded.algorithm,
    payment = excluded.payment,
    fee = excluded.fee,
    threshold = excluded.threshold,
    price_usd = excluded.price_usd,
    pool_hashrate = excluded.pool_hashrate,
    network_hashrate = excluded.network_hashrate,
    miners = excluded.miners,
    blocks_24h = excluded.blocks_24h,
    reward_per_block = excluded.reward_per_block,
    revenue_unit = excluded.revenue_unit,
    revenue_usd_day = excluded.revenue_usd_day,
    merged = excluded.merged,
    sort_order = excluded.sort_order
`);

const seedAllCoins = db.transaction(() => {
  COINS.forEach((coin, index) => {
    seedCoin.run({ ...coin, sortOrder: index });
  });

  db.prepare('DELETE FROM servers').run();
  const insertServer = db.prepare(
    'INSERT INTO servers (symbol, region, host, port, priority) VALUES (?, ?, ?, ?, ?)',
  );
  for (const coin of COINS) {
    for (const server of serversFor(coin.symbol)) {
      insertServer.run(coin.symbol, server.region, server.host, server.port, server.priority);
    }
  }
});

function seedSeries() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM hashrate_series').get().c;
  if (count > 0) return;

  const insert = db.prepare('INSERT INTO hashrate_series (symbol, ts, hashrate) VALUES (?, ?, ?)');
  const hour = 3600 * 1000;
  const anchor = Math.floor(Date.now() / hour) * hour;
  const seedAll = db.transaction(() => {
    for (const coin of COINS) {
      const rand = mulberry32(hashString(coin.symbol));
      let level = coin.poolHashrate;
      for (let i = 47; i >= 0; i -= 1) {
        level = level * (0.985 + rand() * 0.03);
        const drift = 1 + (i / 47) * 0.06;
        insert.run(coin.symbol, anchor - i * hour, Math.round(level * drift));
      }
    }
  });
  seedAll();
}

function seedBlocks() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM blocks').get().c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO blocks (symbol, height, hash, reward, found_at) VALUES (?, ?, ?, ?, ?)',
  );
  const baseHeights = {
    BTC: 898567,
    BCH: 887214,
    BSV: 892140,
    LTC: 2871540,
    DOGE: 5567210,
    ETC: 21874600,
    ZIL: 4218730,
    ETHW: 21430800,
    ETHF: 19872400,
    KAS: 148921400,
    DCR: 968420,
    CKB: 14687300,
    DASH: 2203140,
    ZEC: 2774100,
    GRIN: 3421080,
    ELA: 2718400,
    NMC: 872140,
  };
  const now = Date.now();
  const seedAll = db.transaction(() => {
    for (const coin of COINS) {
      const rand = mulberry32(hashString(`blocks-${coin.symbol}`));
      let ts = now - 60 * 1000;
      for (let i = 0; i < 14; i += 1) {
        const bytes = Array.from({ length: 32 }, () => Math.floor(rand() * 256));
        const hash = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
        const reward = coin.rewardPerBlock * (0.97 + rand() * 0.08);
        insert.run(
          coin.symbol,
          (baseHeights[coin.symbol] || 1000000) - i,
          `0000000000000000000${hash.slice(0, 44)}`,
          Number(reward.toFixed(8)),
          new Date(ts).toISOString(),
        );
        ts -= Math.max(1, Math.round((24 * 60 * 60 * 1000) / coin.blocks24h)) * 1000;
      }
    }
  });
  seedAll();
}

function seedDemoAccount() {
  const email = 'demo@cloverpool.demo';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;

  const now = new Date().toISOString();
  const user = db
    .prepare(
      'INSERT INTO users (email, name, password_hash, alert_enabled, alert_hashrate_hs, created_at) VALUES (?, ?, ?, 1, ?, ?)',
    )
    .run(email, 'Demo Miner', hashPassword('demo1234'), 320e12, now);

  const userId = Number(user.lastInsertRowid);
  const insertSub = db.prepare(
    'INSERT INTO subaccounts (user_id, puid, name, is_default, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const main = Number(insertSub.run(userId, 88923, 'main', 1, now).lastInsertRowid);
  insertSub.run(userId, 88924, 'asia-farm', 0, now);
  insertSub.run(userId, 88925, 'spare-racks', 0, now);

  const insertWorker = db.prepare(
    'INSERT INTO workers (subaccount_id, name, symbol, hashrate, status, last_share_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const workers = [
    [main, 'btc-rig-a01', 'BTC', 182e12, 'online'],
    [main, 'btc-rig-a02', 'BTC', 174e12, 'online'],
    [main, 'btc-rig-b07', 'BTC', 156e12, 'online'],
    [main, 'ltc-asic-01', 'LTC', 8.2e9, 'online'],
    [main, 'ltc-asic-02', 'LTC', 7.4e9, 'online'],
    [main, 'etc-panel-01', 'ETC', 1.6e9, 'online'],
    [main, 'etc-panel-02', 'ETC', 1.4e9, 'offline'],
    [main, 'kas-rig-01', 'KAS', 4.2e12, 'online'],
  ];
  const earlier = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
  for (const [subId, name, symbol, hashrate, status] of workers) {
    insertWorker.run(
      subId,
      name,
      symbol,
      hashrate,
      status,
      status === 'online' ? new Date(Date.now() - 45 * 1000).toISOString() : new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
      earlier,
    );
  }

  const insertAddress = db.prepare(
    'INSERT INTO addresses (user_id, symbol, address, updated_at) VALUES (?, ?, ?, ?)',
  );
  insertAddress.run(userId, 'BTC', 'bc1qcloverpooldemo0x7f4k2m9s8hd3j5n6v0t', now);
  insertAddress.run(userId, 'LTC', 'ltc1qcloverpooldemo084m2x9v7k3j5n6r0t8s4h', now);
  insertAddress.run(userId, 'ETC', '0x9a7c4eCloverPoolDemo41b8f2e6d0a3c7', now);

  const insertPayout = db.prepare(
    'INSERT INTO payouts (user_id, symbol, amount, usd, address, status, tx_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  insertPayout.run(
    userId,
    'BTC',
    0.00421,
    272.3,
    'bc1qcloverpooldemo0x7f4k2m9s8hd3j5n6v0t',
    'paid',
    '7c1a4f0e9b2d8c6a5f3e1d0b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c',
    new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  );
  insertPayout.run(
    userId,
    'LTC',
    0.1842,
    8.2,
    'ltc1qcloverpooldemo084m2x9v7k3j5n6r0t8s4h',
    'paid',
    '3f8e2a1c9d7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',
    new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  );
  insertPayout.run(
    userId,
    'ETC',
    1.842,
    10.96,
    '0x9a7c4eCloverPoolDemo41b8f2e6d0a3c7',
    'pending',
    null,
    new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  );
}

seedAllCoins();
seedSeries();
seedBlocks();
seedDemoAccount();

/* ------------------------------------------------------------- coin helpers */

export function listCoins() {
  return db.prepare('SELECT * FROM coins ORDER BY sort_order').all();
}

export function getCoin(symbol) {
  return db
    .prepare('SELECT * FROM coins WHERE symbol = ?')
    .get(String(symbol || '').toUpperCase());
}

export function coinServers(symbol) {
  return db
    .prepare('SELECT region, host, port FROM servers WHERE symbol = ? ORDER BY priority')
    .all(symbol);
}

export function hashrateSeries(symbol, points = 48) {
  return db
    .prepare(
      'SELECT ts, hashrate FROM hashrate_series WHERE symbol = ? ORDER BY ts DESC LIMIT ?',
    )
    .all(symbol, points)
    .reverse();
}

export function coinBlocks(symbol, limit = 10) {
  return db
    .prepare('SELECT height, hash, reward, found_at FROM blocks WHERE symbol = ? ORDER BY found_at DESC LIMIT ?')
    .all(symbol, limit);
}

export function recentBlocks(limit = 10) {
  return db
    .prepare(
      `SELECT b.symbol, b.height, b.hash, b.reward, b.found_at
       FROM blocks b JOIN coins c ON c.symbol = b.symbol
       ORDER BY b.found_at DESC LIMIT ?`,
    )
    .all(limit);
}
