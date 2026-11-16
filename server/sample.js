import crypto from 'node:crypto';

const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) % 0x100000000;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function address(rand) {
  let body = '';
  for (let i = 0; i < 38; i += 1) body += BECH32[Math.floor(rand() * BECH32.length)];
  return `bc1q${body}`;
}

/** Deterministic demo dataset so a fresh workspace has something to look at. */
export function sampleTransactions(count = 48) {
  const rand = mulberry32(20261116);
  const pools = Array.from({ length: 14 }, () => address(rand));
  const now = Date.now();
  const rows = [];

  for (let i = 0; i < count; i += 1) {
    const roll = rand();
    const status = roll > 0.94 ? 'failed' : roll > 0.86 ? 'pending' : 'confirmed';
    const btc = 0.0004 + rand() ** 3 * 3.1;
    const ts = new Date(now - i * (37 + Math.floor(rand() * 900)) * 1000).toISOString();
    let from = pools[Math.floor(rand() * pools.length)];
    let to = pools[Math.floor(rand() * pools.length)];
    if (to === from) to = pools[(pools.indexOf(from) + 1) % pools.length];

    rows.push({
      hash: crypto
        .createHash('sha256')
        .update(`satoshibench-sample-${i}`)
        .digest('hex'),
      ts,
      from_addr: from,
      to_addr: to,
      amount: Math.round(btc * 1e8),
      fee: 180 + Math.floor(rand() * 7800),
      status,
      block: status === 'pending' ? null : 870000 + Math.floor(rand() * 4200),
    });
  }

  return rows;
}
