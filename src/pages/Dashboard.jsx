import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import CoinBadge from '../components/CoinBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatAmount, formatDateTime, formatHashrate, formatUsd } from '../lib/format.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/account/summary')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="alert error">{error}</p>;
  if (!data) return <div className="loading">Loading dashboard…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>
            {data.user.name} · all sub-accounts
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn primary small" to="/account/workers">
            Add worker
          </Link>
        </div>
      </div>

      <section className="stat-grid four">
        <StatCard
          label="Current hashrate"
          value={formatHashrate(data.hashrateHs)}
          hint={`${data.workers.online} of ${data.workers.total} workers online`}
        />
        <StatCard label="Earnings (24h)" value={formatUsd(data.earnings24hUsd)} />
        <StatCard label="Earnings (30d)" value={formatUsd(data.earnings30dUsd)} />
        <StatCard label="Unpaid balance" value={formatUsd(data.balanceUsd)} hint="Across all coins" tone="accent" />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Earnings by coin</h2>
            <p>Rolling 30 days</p>
          </div>
          <Link className="btn subtle tiny" to="/account/earnings">
            Full report
          </Link>
        </div>

        {data.coins.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th className="num">Hashrate</th>
                  <th className="num">Workers</th>
                  <th className="num">24h</th>
                  <th className="num">30d</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.coins.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <Link className="coin-cell" to={`/coins/${row.symbol}`}>
                        <CoinBadge symbol={row.symbol} />
                        <span>
                          <strong>{row.symbol}</strong>
                          <small>{row.name}</small>
                        </span>
                      </Link>
                    </td>
                    <td className="num mono">{formatHashrate(row.hashrateHs)}</td>
                    <td className="num mono">
                      {row.online}/{row.workers}
                    </td>
                    <td className="num mono">{formatUsd(row.earned24hUsd)}</td>
                    <td className="num mono">{formatUsd(row.earned30dUsd)}</td>
                    <td className="num mono">{formatAmount(row.balance, row.symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No workers yet"
            action={
              <Link className="btn primary small" to="/account/workers">
                Add your first worker
              </Link>
            }
          >
            Add a worker to start tracking hashrate and earnings per coin.
          </EmptyState>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Recent payouts</h2>
            <p>Last five transactions</p>
          </div>
          <Link className="btn subtle tiny" to="/account/earnings">
            All payouts
          </Link>
        </div>
        {data.payouts.length ? (
          <ul className="payout-list">
            {data.payouts.map((payout) => (
              <li key={payout.id}>
                <CoinBadge symbol={payout.symbol} />
                <span className="mono">{formatAmount(payout.amount, payout.symbol)}</span>
                <span className="muted mono">{formatUsd(payout.usd)}</span>
                <span className={`status ${payout.status}`}>{payout.status}</span>
                <span className="muted">{formatDateTime(payout.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No payouts requested yet.</p>
        )}
      </section>
    </>
  );
}
