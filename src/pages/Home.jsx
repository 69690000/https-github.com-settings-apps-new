import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CoinBadge from '../components/CoinBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import { formatCompact, formatHashrate, formatPercent, formatUsd, shortHash, timeAgo } from '../lib/format.js';

const FILTERS = [
  { id: 'all', label: 'All coins', match: () => true },
  { id: 'sha256', label: 'SHA256', match: (coin) => coin.algorithm === 'SHA256' },
  { id: 'scrypt', label: 'Scrypt', match: (coin) => coin.algorithm === 'Scrypt' },
  { id: 'ethash', label: 'Ethash', match: (coin) => coin.algorithm.includes('HASH') },
  {
    id: 'other',
    label: 'Other',
    match: (coin) => !['SHA256', 'Scrypt'].includes(coin.algorithm) && !coin.algorithm.includes('HASH'),
  },
];

export default function Home() {
  const [coins, setCoins] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api('/coins'), api('/blocks?limit=10')])
      .then(([coinData, blockData]) => {
        setCoins(coinData.coins);
        setBlocks(blockData.blocks);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleCoins = useMemo(() => {
    const activeFilter = FILTERS.find((item) => item.id === filter);
    const term = search.trim().toLowerCase();
    return coins
      .filter((coin) => activeFilter.match(coin))
      .filter(
        (coin) =>
          !term ||
          coin.symbol.toLowerCase().includes(term) ||
          coin.name.toLowerCase().includes(term) ||
          coin.algorithm.toLowerCase().includes(term),
      );
  }, [coins, filter, search]);

  const totals = useMemo(
    () => ({
      miners: coins.reduce((sum, coin) => sum + coin.miners, 0),
      blocks: coins.reduce((sum, coin) => sum + coin.blocks24h, 0),
      pools: coins.length,
    }),
    [coins],
  );

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Multi-currency mining pool</span>
            <h1>
              Mine <span className="accent">every coin</span> that matters, from a single account.
            </h1>
            <p>
              FPPS and PPLNS payouts across {totals.pools || 17} coin networks. Point your rigs at one stratum
              address, track hashrate per worker, and get paid every day.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" to="/register">
                Create an account
              </Link>
              <a className="btn ghost" href="#coins">
                Browse coin pools
              </a>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>Coin pools</dt>
                <dd>{loading ? '—' : totals.pools}</dd>
              </div>
              <div>
                <dt>Active miners</dt>
                <dd>{loading ? '—' : formatCompact(totals.miners)}</dd>
              </div>
              <div>
                <dt>Blocks (24h)</dt>
                <dd>{loading ? '—' : formatCompact(totals.blocks)}</dd>
              </div>
              <div>
                <dt>Payouts</dt>
                <dd>Daily</dd>
              </div>
            </dl>
          </div>

          <div className="hero-panel">
            <div className="panel-head">
              <span className="live-dot" /> Live pool feed
            </div>
            <ul className="feed">
              {(blocks.length ? blocks.slice(0, 6) : Array.from({ length: 6 })).map((block, index) => (
                <li key={block ? `${block.symbol}-${block.height}` : index}>
                  {block ? (
                    <>
                      <CoinBadge symbol={block.symbol} />
                      <div>
                        <strong>
                          {block.symbol} #{formatCompact(block.height)}
                        </strong>
                        <small>{shortHash(block.hash, 10, 6)}</small>
                      </div>
                      <span className="feed-time">{timeAgo(block.found_at)}</span>
                    </>
                  ) : (
                    <span className="feed-placeholder" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="shell section" id="coins">
        <div className="section-head">
          <div>
            <h2>Coin pools</h2>
            <p>Every network CloverPool mines, with live hashrate and payout terms.</p>
          </div>
          <input
            className="search-input"
            type="search"
            placeholder="Search coin or algorithm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search coin pools"
          />
        </div>

        <div className="chips" role="tablist" aria-label="Filter by algorithm">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`chip ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? <p className="alert error">{error}</p> : null}

        <div className="table-wrap">
          <table className="data-table pools-table">
            <thead>
              <tr>
                <th>Coin</th>
                <th>Algorithm</th>
                <th className="num">Pool hashrate</th>
                <th className="num">24h trend</th>
                <th className="num">Pool share</th>
                <th className="num">Miners</th>
                <th className="num">Est. revenue</th>
                <th className="num">Fee</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {loading && !visibleCoins.length
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="skeleton-row">
                      <td colSpan={9}>
                        <span />
                      </td>
                    </tr>
                  ))
                : visibleCoins.map((coin) => (
                    <tr key={coin.symbol}>
                      <td>
                        <Link to={`/coins/${coin.symbol}`} className="coin-cell">
                          <CoinBadge symbol={coin.symbol} />
                          <span>
                            <strong>{coin.symbol}</strong>
                            <small>{coin.name}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="tag">{coin.algorithm}</span>
                        {coin.merged ? <small className="merged-note">{coin.merged}</small> : null}
                      </td>
                      <td className="num mono">{formatHashrate(coin.poolHashrate)}</td>
                      <td className="num">
                        <Sparkline values={coin.spark} />
                      </td>
                      <td className="num mono">{formatPercent(coin.poolShare)}</td>
                      <td className="num mono">{formatCompact(coin.miners)}</td>
                      <td className="num mono">
                        {formatUsd(coin.revenueUsdPerDay, { compact: true })}
                        <small className="unit"> / {coin.revenueUnit}</small>
                      </td>
                      <td className="num mono">{coin.fee}%</td>
                      <td className="num">
                        <Link className="btn subtle tiny" to={`/coins/${coin.symbol}`}>
                          Mine
                        </Link>
                      </td>
                    </tr>
                  ))}
              {!loading && !visibleCoins.length ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    No pools match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="shell section features">
        <article className="feature-card">
          <h3>Payout models that fit your farm</h3>
          <p>FPPS and PPLNS pools side by side, with the fee and payout threshold shown before you connect.</p>
        </article>
        <article className="feature-card">
          <h3>Sub-accounts for every site</h3>
          <p>Split workers across sub-accounts, each with its own puid, hashrate view and earnings breakdown.</p>
        </article>
        <article className="feature-card">
          <h3>Daily payouts, no minimum games</h3>
          <p>Earnings are credited every day and paid to your per-coin address once you pass the threshold.</p>
        </article>
      </section>
    </>
  );
}
