const SATS_PER_BTC = 100_000_000;

export function formatSats(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('en-US')} sats`;
}

export function formatBtc(value) {
  return `${((Number(value) || 0) / SATS_PER_BTC).toFixed(8)} BTC`;
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function shortHash(hash) {
  if (!hash) return '—';
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function shortAddress(address) {
  if (!address) return '—';
  if (address.length <= 15) return address;
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatTime(ts) {
  if (!ts) return '—';
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function relativeTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);
  const hours = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  if (Math.abs(days) < 30) return relative.format(days, 'day');
  return formatTime(ts);
}
