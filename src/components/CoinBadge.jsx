const COLORS = {
  BTC: '#f7931a',
  BCH: '#8dc351',
  BSV: '#eab300',
  LTC: '#b6bcc2',
  DOGE: '#c2a633',
  ETC: '#3ab83a',
  ZIL: '#29ccc4',
  ETHW: '#7782ff',
  ETHF: '#9b8cf0',
  KAS: '#70c7ba',
  DCR: '#2ed6a1',
  CKB: '#3cc8c8',
  DASH: '#2b8ce7',
  ZEC: '#f4b728',
  GRIN: '#f9d000',
  ELA: '#1a9ae2',
  NMC: '#a5a5a5',
};

function fallbackColor(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) hash = (hash * 31 + symbol.charCodeAt(i)) % 360;
  return `hsl(${hash} 62% 58%)`;
}

export default function CoinBadge({ symbol, size = 'md' }) {
  const color = COLORS[symbol] || fallbackColor(symbol);
  return (
    <span
      className={`coin-badge ${size === 'lg' ? 'lg' : ''}`}
      style={{ '--coin-color': color }}
      aria-hidden="true"
    >
      {symbol.slice(0, 3)}
    </span>
  );
}
