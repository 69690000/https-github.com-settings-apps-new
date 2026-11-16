import { db } from './db.js';
import { usdPerHashPerDay } from './coins.js';

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Per-worker, per-day variance so a worker's history looks alive but stable. */
function jitter(workerId, dateKey) {
  return 0.88 + ((hashString(`${workerId}:${dateKey}`) % 1000) / 1000) * 0.24;
}

function dayKeys(days) {
  const keys = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function workersFor(userId) {
  return db
    .prepare(
      `SELECT w.id, w.name, w.symbol, w.hashrate, w.created_at, w.subaccount_id,
              s.name AS sub_name, s.puid,
              c.price_usd, c.revenue_usd_day, c.revenue_unit
       FROM workers w
       JOIN subaccounts s ON s.id = w.subaccount_id
       JOIN coins c ON c.symbol = w.symbol
       WHERE s.user_id = ?`,
    )
    .all(userId);
}

/**
 * Daily earnings per coin, derived from each worker's hashrate and its coin's
 * pool rate. Rows are grouped by day + coin.
 */
export function earningsForUser(userId, { days = 30, symbol = null } = {}) {
  const workers = workersFor(userId).filter((w) => !symbol || w.symbol === symbol);
  const keys = dayKeys(days);
  const byKey = new Map();

  for (const key of keys) {
    for (const worker of workers) {
      if (worker.created_at.slice(0, 10) > key) continue;
      const rate = usdPerHashPerDay({
        revenueUsdPerDay: worker.revenue_usd_day,
        revenueUnit: worker.revenue_unit,
      });
      const usd = worker.hashrate * rate * jitter(worker.id, key);
      const id = `${key}|${worker.symbol}`;
      const row = byKey.get(id) || {
        date: key,
        symbol: worker.symbol,
        hashrate: 0,
        usd: 0,
        amount: 0,
      };
      row.hashrate += worker.hashrate;
      row.usd += usd;
      byKey.set(id, row);
    }
  }

  const rows = [...byKey.values()]
    .map((row) => {
      const price = workers.find((w) => w.symbol === row.symbol)?.price_usd || 1;
      return {
        ...row,
        amount: Number((row.usd / price).toFixed(8)),
        usd: Number(row.usd.toFixed(2)),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.symbol.localeCompare(b.symbol)));

  const daily = {};
  for (const row of rows) {
    daily[row.date] = Number(((daily[row.date] || 0) + row.usd).toFixed(2));
  }

  return { rows, daily };
}

export function payoutTotals(userId) {
  const rows = db
    .prepare('SELECT symbol, COALESCE(SUM(amount), 0) AS amount, COALESCE(SUM(usd), 0) AS usd FROM payouts WHERE user_id = ? GROUP BY symbol')
    .all(userId);
  const bySymbol = {};
  let usd = 0;
  for (const row of rows) {
    bySymbol[row.symbol] = row.amount;
    usd += row.usd;
  }
  return { bySymbol, usd: Number(usd.toFixed(2)) };
}
