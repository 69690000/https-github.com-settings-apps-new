import { Router } from 'express';
import { db, getCoin, listCoins } from '../db.js';
import { requireAuth } from '../auth.js';
import { earningsForUser } from '../earnings.js';

const router = Router();
router.use('/account', requireAuth);

const WORKER_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$/;
const SUB_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,19}$/;

function mapWorker(worker) {
  return {
    id: worker.id,
    name: worker.name,
    symbol: worker.symbol,
    hashrateHs: worker.hashrate,
    status: worker.status,
    lastShareAt: worker.last_share_at,
    createdAt: worker.created_at,
    subaccountId: worker.subaccount_id,
    subaccountName: worker.sub_name,
    puid: worker.puid,
  };
}

function userWorkers(userId) {
  return db
    .prepare(
      `SELECT w.*, s.name AS sub_name, s.puid
       FROM workers w JOIN subaccounts s ON s.id = w.subaccount_id
       WHERE s.user_id = ?
       ORDER BY w.created_at DESC, w.id DESC`,
    )
    .all(userId);
}

function ownsWorker(userId, workerId) {
  return db
    .prepare(
      `SELECT w.* FROM workers w JOIN subaccounts s ON s.id = w.subaccount_id
       WHERE w.id = ? AND s.user_id = ?`,
    )
    .get(workerId, userId);
}

function ownSubaccount(userId, subaccountId) {
  return db
    .prepare('SELECT * FROM subaccounts WHERE id = ? AND user_id = ?')
    .get(subaccountId, userId);
}

function newPuid() {
  for (;;) {
    const puid = 100000 + Math.floor(Math.random() * 900000);
    if (!db.prepare('SELECT 1 FROM subaccounts WHERE puid = ?').get(puid)) return puid;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Unpaid balance per coin: last 30 days of earnings minus payouts already made. */
function balances(userId, days = 30) {
  const { rows } = earningsForUser(userId, { days });
  const prices = new Map(listCoins().map((coin) => [coin.symbol, coin.price_usd]));
  const earned = new Map();
  for (const row of rows) {
    earned.set(row.symbol, (earned.get(row.symbol) || 0) + row.amount);
  }
  const paid = db
    .prepare('SELECT symbol, COALESCE(SUM(amount), 0) AS amount FROM payouts WHERE user_id = ? GROUP BY symbol')
    .all(userId);
  const paidBySymbol = new Map(paid.map((row) => [row.symbol, row.amount]));

  const result = {};
  for (const [symbol, amount] of earned) {
    const balance = Math.max(0, amount - (paidBySymbol.get(symbol) || 0));
    result[symbol] = {
      amount: Number(balance.toFixed(8)),
      usd: Number((balance * (prices.get(symbol) || 0)).toFixed(2)),
    };
  }
  return result;
}

router.get('/account/summary', (req, res) => {
  const userId = req.user.id;
  const workers = userWorkers(userId);
  const coins = new Map(listCoins().map((coin) => [coin.symbol, coin]));
  const { rows } = earningsForUser(userId, { days: 30 });
  const balance = balances(userId, 30);
  const today = todayKey();

  const perCoin = new Map();
  for (const worker of workers) {
    const row = perCoin.get(worker.symbol) || {
      symbol: worker.symbol,
      name: coins.get(worker.symbol)?.name || worker.symbol,
      hashrateHs: 0,
      workers: 0,
      online: 0,
      earned24hUsd: 0,
      earned30dUsd: 0,
    };
    row.workers += 1;
    if (worker.status === 'online') {
      row.online += 1;
      row.hashrateHs += worker.hashrate;
    }
    perCoin.set(worker.symbol, row);
  }
  for (const row of rows) {
    const target = perCoin.get(row.symbol);
    if (!target) continue;
    target.earned30dUsd += row.usd;
    if (row.date === today) target.earned24hUsd += row.usd;
  }
  for (const row of perCoin.values()) {
    row.earned24hUsd = Number(row.earned24hUsd.toFixed(2));
    row.earned30dUsd = Number(row.earned30dUsd.toFixed(2));
    row.balance = balance[row.symbol]?.amount || 0;
    row.balanceUsd = balance[row.symbol]?.usd || 0;
    row.priceUsd = coins.get(row.symbol)?.price_usd || 0;
    row.threshold = coins.get(row.symbol)?.threshold || 0;
  }

  const coinRows = [...perCoin.values()].sort((a, b) => b.hashrateHs - a.hashrateHs);
  const payouts = db
    .prepare('SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(userId);

  res.json({
    user: { name: req.user.name, email: req.user.email },
    workers: {
      total: workers.length,
      online: workers.filter((worker) => worker.status === 'online').length,
    },
    hashrateHs: coinRows.reduce((sum, row) => sum + row.hashrateHs, 0),
    earnings24hUsd: Number(coinRows.reduce((sum, row) => sum + row.earned24hUsd, 0).toFixed(2)),
    earnings30dUsd: Number(coinRows.reduce((sum, row) => sum + row.earned30dUsd, 0).toFixed(2)),
    balanceUsd: Number(coinRows.reduce((sum, row) => sum + row.balanceUsd, 0).toFixed(2)),
    coins: coinRows,
    payouts: payouts.map((payout) => ({
      id: payout.id,
      symbol: payout.symbol,
      amount: payout.amount,
      usd: payout.usd,
      status: payout.status,
      txHash: payout.tx_hash,
      createdAt: payout.created_at,
    })),
  });
});

/* ------------------------------------------------------------- workers */

router.get('/account/workers', (req, res) => {
  const symbol = req.query.symbol ? String(req.query.symbol).toUpperCase() : null;
  const subaccountId = req.query.subaccount ? Number(req.query.subaccount) : null;
  const workers = userWorkers(req.user.id)
    .filter((worker) => !symbol || worker.symbol === symbol)
    .filter((worker) => !subaccountId || worker.subaccount_id === subaccountId);

  res.json({
    workers: workers.map(mapWorker),
    hashrateHs: workers
      .filter((worker) => worker.status === 'online')
      .reduce((sum, worker) => sum + worker.hashrate, 0),
  });
});

router.post('/account/workers', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const symbol = String(req.body?.symbol || '').toUpperCase();
  const hashrateHs = Number(req.body?.hashrateHs);
  const subaccountId = Number(req.body?.subaccountId);

  if (!WORKER_NAME_RE.test(name)) {
    res.status(400).json({ error: 'Worker name must be 2–32 characters: letters, numbers, . _ -' });
    return;
  }
  if (!getCoin(symbol)) {
    res.status(400).json({ error: 'Choose a coin' });
    return;
  }
  if (!Number.isFinite(hashrateHs) || hashrateHs <= 0) {
    res.status(400).json({ error: 'Enter the worker hashrate' });
    return;
  }
  const subaccount = ownSubaccount(req.user.id, subaccountId);
  if (!subaccount) {
    res.status(400).json({ error: 'Choose a sub-account you own' });
    return;
  }
  const duplicate = db
    .prepare('SELECT 1 FROM workers WHERE subaccount_id = ? AND name = ?')
    .get(subaccountId, name);
  if (duplicate) {
    res.status(409).json({ error: 'That worker name already exists in this sub-account' });
    return;
  }

  const now = new Date().toISOString();
  const id = db
    .prepare(
      "INSERT INTO workers (subaccount_id, name, symbol, hashrate, status, last_share_at, created_at) VALUES (?, ?, ?, ?, 'online', ?, ?)",
    )
    .run(subaccountId, name, symbol, hashrateHs, now, now).lastInsertRowid;

  const worker = db
    .prepare(
      `SELECT w.*, s.name AS sub_name, s.puid FROM workers w JOIN subaccounts s ON s.id = w.subaccount_id WHERE w.id = ?`,
    )
    .get(id);
  res.status(201).json({ worker: mapWorker(worker) });
});

router.patch('/account/workers/:id', (req, res) => {
  const worker = ownsWorker(req.user.id, Number(req.params.id));
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }
  const updates = {};
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!WORKER_NAME_RE.test(name)) {
      res.status(400).json({ error: 'Worker name must be 2–32 characters: letters, numbers, . _ -' });
      return;
    }
    const duplicate = db
      .prepare('SELECT 1 FROM workers WHERE subaccount_id = ? AND name = ? AND id <> ?')
      .get(worker.subaccount_id, name, worker.id);
    if (duplicate) {
      res.status(409).json({ error: 'That worker name already exists in this sub-account' });
      return;
    }
    updates.name = name;
  }
  if (req.body?.status !== undefined) {
    const status = String(req.body.status);
    if (!['online', 'offline', 'paused'].includes(status)) {
      res.status(400).json({ error: 'Unknown worker status' });
      return;
    }
    updates.status = status;
    if (status === 'online') updates.last_share_at = new Date().toISOString();
  }

  if (updates.name !== undefined) {
    db.prepare('UPDATE workers SET name = ? WHERE id = ?').run(updates.name, worker.id);
  }
  if (updates.status !== undefined) {
    db.prepare('UPDATE workers SET status = ?, last_share_at = ? WHERE id = ?').run(
      updates.status,
      updates.last_share_at || worker.last_share_at,
      worker.id,
    );
  }

  const updated = db
    .prepare(
      `SELECT w.*, s.name AS sub_name, s.puid FROM workers w JOIN subaccounts s ON s.id = w.subaccount_id WHERE w.id = ?`,
    )
    .get(worker.id);
  res.json({ worker: mapWorker(updated) });
});

router.delete('/account/workers/:id', (req, res) => {
  const worker = ownsWorker(req.user.id, Number(req.params.id));
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }
  db.prepare('DELETE FROM workers WHERE id = ?').run(worker.id);
  res.json({ ok: true });
});

/* --------------------------------------------------------- sub-accounts */

function subaccountRows(userId) {
  const rows = db
    .prepare(
      `SELECT s.*,
              (SELECT COUNT(*) FROM workers w WHERE w.subaccount_id = s.id) AS workers,
              (SELECT COUNT(*) FROM workers w WHERE w.subaccount_id = s.id AND w.status = 'online') AS online,
              (SELECT COALESCE(SUM(w.hashrate), 0) FROM workers w WHERE w.subaccount_id = s.id AND w.status = 'online') AS hashrate
       FROM subaccounts s WHERE s.user_id = ?
       ORDER BY s.is_default DESC, s.id ASC`,
    )
    .all(userId);
  return rows.map((row) => ({
    id: row.id,
    puid: row.puid,
    name: row.name,
    isDefault: Boolean(row.is_default),
    workers: row.workers,
    online: row.online,
    hashrateHs: row.hashrate,
    createdAt: row.created_at,
  }));
}

router.get('/account/subaccounts', (req, res) => {
  res.json({ subaccounts: subaccountRows(req.user.id) });
});

router.post('/account/subaccounts', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!SUB_NAME_RE.test(name)) {
    res.status(400).json({ error: 'Sub-account name must be 3–20 characters: letters, numbers, . _ -' });
    return;
  }
  const duplicate = db
    .prepare('SELECT 1 FROM subaccounts WHERE user_id = ? AND name = ?')
    .get(req.user.id, name);
  if (duplicate) {
    res.status(409).json({ error: 'You already have a sub-account with that name' });
    return;
  }
  const total = db.prepare('SELECT COUNT(*) AS c FROM subaccounts WHERE user_id = ?').get(req.user.id).c;
  if (total >= 2000) {
    res.status(400).json({ error: 'Sub-account limit reached' });
    return;
  }

  db.prepare('INSERT INTO subaccounts (user_id, puid, name, is_default, created_at) VALUES (?, ?, ?, 0, ?)').run(
    req.user.id,
    newPuid(),
    name,
    new Date().toISOString(),
  );
  res.status(201).json({ subaccounts: subaccountRows(req.user.id) });
});

router.patch('/account/subaccounts/:id', (req, res) => {
  const subaccount = ownSubaccount(req.user.id, Number(req.params.id));
  if (!subaccount) {
    res.status(404).json({ error: 'Sub-account not found' });
    return;
  }
  const name = String(req.body?.name || '').trim();
  if (!SUB_NAME_RE.test(name)) {
    res.status(400).json({ error: 'Sub-account name must be 3–20 characters: letters, numbers, . _ -' });
    return;
  }
  const duplicate = db
    .prepare('SELECT 1 FROM subaccounts WHERE user_id = ? AND name = ? AND id <> ?')
    .get(req.user.id, name, subaccount.id);
  if (duplicate) {
    res.status(409).json({ error: 'You already have a sub-account with that name' });
    return;
  }
  db.prepare('UPDATE subaccounts SET name = ? WHERE id = ?').run(name, subaccount.id);
  res.json({ subaccounts: subaccountRows(req.user.id) });
});

router.delete('/account/subaccounts/:id', (req, res) => {
  const subaccount = ownSubaccount(req.user.id, Number(req.params.id));
  if (!subaccount) {
    res.status(404).json({ error: 'Sub-account not found' });
    return;
  }
  if (subaccount.is_default) {
    res.status(400).json({ error: 'The main sub-account cannot be deleted' });
    return;
  }
  db.prepare('DELETE FROM subaccounts WHERE id = ?').run(subaccount.id);
  res.json({ subaccounts: subaccountRows(req.user.id) });
});

/* ------------------------------------------------------- earnings & payouts */

router.get('/account/earnings', (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const symbol = req.query.symbol && req.query.symbol !== 'ALL' ? String(req.query.symbol).toUpperCase() : null;
  const { rows, daily } = earningsForUser(req.user.id, { days, symbol });
  const balance = balances(req.user.id, days);

  const byCoin = new Map();
  for (const row of rows) {
    const current = byCoin.get(row.symbol) || { symbol: row.symbol, amount: 0, usd: 0 };
    current.amount += row.amount;
    current.usd += row.usd;
    byCoin.set(row.symbol, current);
  }

  res.json({
    days,
    rows,
    daily,
    totals: {
      usd: Number(rows.reduce((sum, row) => sum + row.usd, 0).toFixed(2)),
      byCoin: [...byCoin.values()]
        .map((row) => ({
          symbol: row.symbol,
          amount: Number(row.amount.toFixed(8)),
          usd: Number(row.usd.toFixed(2)),
          balance: balance[row.symbol]?.amount || 0,
        }))
        .sort((a, b) => b.usd - a.usd),
    },
    balances: balance,
  });
});

router.get('/account/payouts', (req, res) => {
  const payouts = db
    .prepare('SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({
    payouts: payouts.map((payout) => ({
      id: payout.id,
      symbol: payout.symbol,
      amount: payout.amount,
      usd: payout.usd,
      address: payout.address,
      status: payout.status,
      txHash: payout.tx_hash,
      createdAt: payout.created_at,
    })),
  });
});

router.post('/account/payouts', (req, res) => {
  const symbol = String(req.body?.symbol || '').toUpperCase();
  const coin = getCoin(symbol);
  if (!coin) {
    res.status(400).json({ error: 'Choose a coin' });
    return;
  }
  const addressRow = db
    .prepare('SELECT address FROM addresses WHERE user_id = ? AND symbol = ?')
    .get(req.user.id, symbol);
  if (!addressRow?.address) {
    res.status(400).json({ error: `Add a ${symbol} payout address first` });
    return;
  }
  const balance = balances(req.user.id, 90)[symbol]?.amount || 0;
  if (balance <= 0) {
    res.status(400).json({ error: `No ${symbol} balance to pay out yet` });
    return;
  }
  if (balance < coin.threshold) {
    res.status(400).json({
      error: `Minimum payout is ${coin.threshold} ${symbol}`,
    });
    return;
  }

  const payout = {
    amount: Number(balance.toFixed(8)),
    usd: Number((balance * coin.price_usd).toFixed(2)),
  };
  db.prepare(
    "INSERT INTO payouts (user_id, symbol, amount, usd, address, status, tx_hash, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)",
  ).run(req.user.id, symbol, payout.amount, payout.usd, addressRow.address, new Date().toISOString());

  res.status(201).json({ payout: { ...payout, symbol, status: 'pending' } });
});

/* ---------------------------------------------------- addresses & settings */

router.get('/account/addresses', (req, res) => {
  const rows = db
    .prepare('SELECT symbol, address, updated_at FROM addresses WHERE user_id = ?')
    .all(req.user.id);
  res.json({
    addresses: rows.map((row) => ({
      symbol: row.symbol,
      address: row.address,
      updatedAt: row.updated_at,
    })),
  });
});

router.put('/account/addresses/:symbol', (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase();
  if (!getCoin(symbol)) {
    res.status(400).json({ error: 'Unknown coin' });
    return;
  }
  const address = String(req.body?.address || '').trim();
  if (address.length < 10 || address.length > 120) {
    res.status(400).json({ error: 'Enter a valid wallet address' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO addresses (user_id, symbol, address, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, symbol) DO UPDATE SET address = excluded.address, updated_at = excluded.updated_at`,
  ).run(req.user.id, symbol, address, now);
  res.json({ address: { symbol, address, updatedAt: now } });
});

router.patch('/account/settings', (req, res) => {
  const updates = [];
  const params = [];
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 2 || name.length > 40) {
      res.status(400).json({ error: 'Name must be 2–40 characters' });
      return;
    }
    updates.push('name = ?');
    params.push(name);
  }
  if (req.body?.alertEnabled !== undefined) {
    updates.push('alert_enabled = ?');
    params.push(req.body.alertEnabled ? 1 : 0);
  }
  if (req.body?.alertHashrateHs !== undefined) {
    const hashrate = Number(req.body.alertHashrateHs);
    if (!Number.isFinite(hashrate) || hashrate < 0) {
      res.status(400).json({ error: 'Enter a valid alert hashrate' });
      return;
    }
    updates.push('alert_hashrate_hs = ?');
    params.push(hashrate);
  }
  if (!updates.length) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      alertEnabled: Boolean(user.alert_enabled),
      alertHashrateHs: user.alert_hashrate_hs,
      createdAt: user.created_at,
    },
  });
});

export default router;
