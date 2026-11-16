const HASHRATE_UNITS = [
  ['EH', 1e18],
  ['PH', 1e15],
  ['TH', 1e12],
  ['GH', 1e9],
  ['MH', 1e6],
  ['KH', 1e3],
  ['H', 1],
];

export const UNIT_FACTOR = {
  H: 1,
  K: 1e3,
  KH: 1e3,
  M: 1e6,
  MH: 1e6,
  G: 1e9,
  GH: 1e9,
  T: 1e12,
  TH: 1e12,
  P: 1e15,
  PH: 1e15,
  E: 1e18,
  EH: 1e18,
};

function trim(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatHashrate(hs) {
  if (!Number.isFinite(hs) || hs <= 0) return '0 H/s';
  for (const [unit, factor] of HASHRATE_UNITS) {
    if (hs >= factor) return `${trim(hs / factor)} ${unit}/s`;
  }
  return `${hs} H/s`;
}

export function hashrateParts(hs) {
  if (!Number.isFinite(hs) || hs <= 0) return { value: 0, unit: 'H' };
  for (const [unit, factor] of HASHRATE_UNITS) {
    if (hs >= factor) return { value: hs / factor, unit: unit.replace('/s', '') };
  }
  return { value: hs, unit: 'H' };
}

export function formatUsd(amount, { compact = false } = {}) {
  const value = Number(amount) || 0;
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAmount(amount, symbol = '') {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  let digits = 8;
  if (abs >= 1000) digits = 2;
  else if (abs >= 1) digits = 4;
  else if (abs >= 0.01) digits = 6;
  const text = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  return symbol ? `${text} ${symbol}` : text;
}

export function formatCompact(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function formatPercent(value, digits = 2) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso) {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function shortHash(hash, head = 12, tail = 8) {
  if (!hash) return '—';
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
