import express from 'express';
import { db, insertTransactions, isEmpty } from './db.js';
import { parseTransactionsCsv } from './csv.js';
import { sampleTransactions } from './sample.js';

const app = express();
app.use(express.json({ limit: '16mb' }));

const ORDER_BY = {
  newest: 'ts IS NULL, ts DESC, id DESC',
  oldest: 'ts IS NULL, ts ASC, id ASC',
  amount_desc: 'amount DESC, id DESC',
  amount_asc: 'amount ASC, id DESC',
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/transactions', (req, res) => {
  const status = String(req.query.status || 'all');
  const search = String(req.query.search || '').trim();
  const sort = ORDER_BY[String(req.query.sort)] ? String(req.query.sort) : 'newest';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 25));

  const conditions = [];
  const params = {};
  if (status !== 'all') {
    conditions.push('status = @status');
    params.status = status;
  }
  if (search) {
    conditions.push('(hash LIKE @q OR from_addr LIKE @q OR to_addr LIKE @q)');
    params.q = `%${search}%`;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM transactions ${where}`).get(params).c;
  const items = db
    .prepare(
      `SELECT * FROM transactions ${where} ORDER BY ${ORDER_BY[sort]} LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  res.json({ items, total, page, pageSize });
});

app.get('/api/stats', (_req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS totalAmount,
              COALESCE(SUM(fee), 0) AS totalFees,
              MIN(ts) AS firstTs,
              MAX(ts) AS lastTs,
              MAX(block) AS lastBlock
       FROM transactions`,
    )
    .get();

  const uniqueAddresses = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT from_addr AS a FROM transactions WHERE from_addr IS NOT NULL AND from_addr <> ''
         UNION
         SELECT to_addr FROM transactions WHERE to_addr IS NOT NULL AND to_addr <> ''
       )`,
    )
    .get().c;

  const statuses = db
    .prepare('SELECT status, COUNT(*) AS count FROM transactions GROUP BY status')
    .all();

  res.json({ ...totals, uniqueAddresses, statuses });
});

app.post('/api/transactions/import', (req, res) => {
  const csv = req.body?.csv;
  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'The CSV is empty — nothing to import.' });
  }

  const { rows, skippedRows, missingColumns } = parseTransactionsCsv(csv);
  if (missingColumns) {
    return res.status(400).json({
      error: 'No header row with a hash or amount column was found. Expected columns such as hash, timestamp, from, to, amount, fee, status, block.',
    });
  }
  if (!rows.length) {
    return res.status(400).json({ error: 'No usable transaction rows were found in that file.' });
  }

  const imported = insertTransactions(rows);
  return res.json({ imported, duplicates: rows.length - imported, skippedRows });
});

app.post('/api/sample', (_req, res) => {
  const rows = sampleTransactions();
  const imported = insertTransactions(rows, 'sample');
  res.json({ imported, duplicates: rows.length - imported });
});

app.delete('/api/transactions/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid transaction id.' });
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Transaction not found.' });
  return res.json({ deleted: info.changes });
});

app.delete('/api/transactions', (_req, res) => {
  const info = db.prepare('DELETE FROM transactions').run();
  res.json({ deleted: info.changes });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

if (isEmpty()) {
  insertTransactions(sampleTransactions(), 'sample');
}

const port = Number(process.env.PORT || 8000);
app.listen(port, '0.0.0.0', () => {
  console.log(`SatoshiBench API listening on http://0.0.0.0:${port}`);
});
