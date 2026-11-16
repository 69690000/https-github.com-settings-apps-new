import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CoinBadge from '../components/CoinBadge.jsx';
import CopyButton from '../components/CopyButton.jsx';
import StatCard from '../components/StatCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { formatAmount, formatCompact, formatHashrate, formatPercent, formatUsd, shortHash, timeAgo } from '../lib/format.js';
import { useAuth } from '../auth.jsx';

export default function CoinDetail() {
  const { symbol } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api(`/coins/${symbol}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="shell page-pad loading">Loading pool…</div>;
  if (error || !data) {
    return (
      <div className="shell page-pad">
        <p className="alert error">{error || 'Pool not found'}</p>
        <Link className="btn ghost" to="/">
          Back to all pools
        </Link>
      </div>
    );
  }

  const { coin, series, servers, blocks, latestHeight } = data;
  const chartPoints = series.map((point) => ({
    label: new Date(point.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    value: point.hashrate,
  }));

  return (
    <div className="shell page-pad">
      <Link className="back-link" to="/">
        ← All coin pools
      </Link>

      <header className="coin-header">
        <div className="coin-title">
          <CoinBadge symbol={coin.symbol} size="lg" />
          <div>
            <h1>
              {coin.name} <span className="ticker">{coin.symbol}</span>
            </h1>
            <div className="pill-row">
              <span className="tag">{coin.algorithm}</span>
              <span className="tag">{coin.payment}</span>
              {coin.merged ? <span className="tag accent">{coin.merged}</span> : null}
            </div>
          </div>
        </div>
        <div className="coin-price">
          <span>Price</span>
          <strong>{formatUsd(coin.priceUsd)}</strong>
        </div>
      </header>

      <section className="stat-grid">
        <StatCard label="Pool hashrate" value={formatHashrate(coin.poolHashrate)} hint={`${formatPercent(coin.poolShare)} of network`} />
        <StatCard label="Network hashrate" value={formatHashrate(coin.networkHashrate)} />
        <StatCard label="Active miners" value={formatCompact(coin.miners)} />
        <StatCard label="Blocks (24h)" value={formatCompact(coin.blocks24h)} />
        <StatCard label="Block reward" value={formatAmount(coin.rewardPerBlock, coin.symbol)} />
        <StatCard label="Pool fee" value={`${coin.fee}%`} hint={coin.payment} />
        <StatCard label="Payout threshold" value={formatAmount(coin.threshold, coin.symbol)} tone="accent" />
        <StatCard label="Chain height" value={latestHeight ? formatCompact(latestHeight) : '—'} />
      </section>

      <section className="card chart-card">
        <div className="card-head">
          <div>
            <h2>Pool hashrate</h2>
            <p>Last 48 hours</p>
          </div>
          <span className="pill mono">{formatHashrate(coin.poolHashrate)}</span>
        </div>
        <TrendChart points={chartPoints} format={(value) => formatHashrate(value)} height={240} />
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Stratum servers</h2>
              <p>Point your miner at the closest region.</p>
            </div>
          </div>
          <ul className="server-list">
            {servers.map((server) => {
              const url = `stratum+tcp://${server.host}:${server.port}`;
              return (
                <li key={server.host}>
                  <div>
                    <strong>{server.region}</strong>
                    <code>{url}</code>
                  </div>
                  <CopyButton value={url} />
                </li>
              );
            })}
          </ul>
          <p className="hint">
            Worker name format: <code>account.worker</code> — create workers in your dashboard to track each rig.
          </p>
          <Link className="btn primary" to={user ? '/account/workers' : '/register'}>
            {user ? 'Add a worker' : 'Start mining'}
          </Link>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Recent blocks</h2>
              <p>Found by this pool</p>
            </div>
          </div>
          <ul className="block-list">
            {blocks.map((block) => (
              <li key={`${block.height}-${block.hash}`}>
                <span className="mono">#{formatCompact(block.height)}</span>
                <span className="mono muted">{shortHash(block.hash, 10, 6)}</span>
                <span className="mono">{formatAmount(block.reward, coin.symbol)}</span>
                <span className="muted">{timeAgo(block.found_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
