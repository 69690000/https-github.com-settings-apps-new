import crypto from 'node:crypto';

const HEADER_ALIASES = {
  hash: ['hash', 'tx_hash', 'txhash', 'tx_id', 'txid', 'transaction_hash', 'transaction_id', 'id'],
  ts: ['timestamp', 'time', 'date', 'datetime', 'block_time', 'blocktime', 'ts', 'confirmed_at'],
  from_addr: ['from', 'from_address', 'from_addr', 'sender', 'sender_address', 'src', 'source_address'],
  to_addr: ['to', 'to_address', 'to_addr', 'receiver', 'receiver_address', 'dst', 'dest', 'recipient'],
  amount: ['amount', 'value', 'sats', 'satoshis', 'amount_sats', 'value_sats', 'amount_btc', 'btc'],
  fee: ['fee', 'fees', 'fee_sats', 'fee_btc', 'network_fee'],
  status: ['status', 'state', 'result', 'confirmed'],
  block: ['block', 'block_height', 'blockheight', 'block_number', 'height'],
};

const BTC_HEADERS = new Set(['amount_btc', 'btc', 'fee_btc']);

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch] += 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';
}

function splitCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function buildColumnMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] === undefined && aliases.includes(key)) {
        map[field] = { index, scale: BTC_HEADERS.has(key) ? 1e8 : 1 };
        return;
      }
    }
  });
  return map;
}

function parseNumber(value, scale = 1) {
  const cleaned = String(value ?? '').replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * scale * 100) / 100;
}

function parseTimestamp(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    const ms = raw.length >= 13 ? num : num * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseBlock(value) {
  const cleaned = String(value ?? '').replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'confirmed';
  if (['failed', 'error', 'reverted', 'invalid', 'rejected'].includes(raw)) return 'failed';
  if (['pending', 'unconfirmed', 'mempool', 'queued', '0', 'false', 'no'].includes(raw)) return 'pending';
  return 'confirmed';
}

function text(value) {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : raw;
}

function hashRow(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Parses a transactions CSV into rows ready for insert.
 * Recognised columns: hash, timestamp, from, to, amount, fee, status, block.
 */
export function parseTransactionsCsv(csvText) {
  const text0 = String(csvText).replace(/^\uFEFF/, '');
  if (!text0.trim()) return { rows: [], skippedRows: 0 };

  const delimiter = detectDelimiter(text0);
  const table = splitCsv(text0, delimiter).filter((row) => row.some((cell) => String(cell).trim() !== ''));
  if (!table.length) return { rows: [], skippedRows: 0 };

  const headerRow = table[0].map((cell) => String(cell));
  const columns = buildColumnMap(headerRow);
  if (columns.amount === undefined && columns.hash === undefined) {
    return { rows: [], skippedRows: table.length - 1, missingColumns: true };
  }

  const cell = (row, field) => (columns[field] ? row[columns[field].index] : undefined);
  const rows = [];
  let skippedRows = 0;

  for (let i = 1; i < table.length; i += 1) {
    const row = table[i];
    const amount = parseNumber(cell(row, 'amount'), columns.amount?.scale ?? 1);
    const hash = text(cell(row, 'hash'));
    const ts = parseTimestamp(cell(row, 'ts'));
    const from = text(cell(row, 'from_addr'));
    const to = text(cell(row, 'to_addr'));

    if (!hash && amount === 0 && !ts && !from && !to) {
      skippedRows += 1;
      continue;
    }

    rows.push({
      hash: hash || hashRow([ts, from, to, amount, i]),
      ts,
      from_addr: from,
      to_addr: to,
      amount,
      fee: parseNumber(cell(row, 'fee'), columns.fee?.scale ?? 1),
      status: normalizeStatus(cell(row, 'status')),
      block: parseBlock(cell(row, 'block')),
    });
  }

  return { rows, skippedRows };
}
