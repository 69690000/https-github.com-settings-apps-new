import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import CoinBadge from '../components/CoinBadge.jsx';
import TrendChart from '../components/TrendChart.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatAmount, formatDateTime, formatHashrate, formatUsd, shortHash } from '../lib/format.js';

export default function Earnings() {
  const [days, setDays] = useState(30);
  const [symbol, setSymbol] = useState('ALL');
  const [data, setData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busySymbol, setBusySymbol] = useState('');

  const loadEarnings = (nextDays = days, nextSymbol = symbol) =>
    api(`/account/earnings?days=${nextDays}&symbol=${nextSymbol}`).then(setData);

  const loadPayouts = () => api('/account/payouts').then((result) => setPayouts(result.payouts));

  useEffect(() => {
    Promise.all([api('/coins'), loadPayouts()])
      .then(([coinData]) => setCoins(coinData.coins))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadEarnings(days, symbol).catch((err) => setError(err.message));
  }, [days, symbol]);

  const coinMap = useMemo(() => new Map(coins.map((coin) => [coin.symbol, coin])), [coins]);

  const chartPoints = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.daily)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, value]) => ({
        label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
      }));
  }, [data]);

  const requestPayout = async (coinSymbol) => {
    setBusySymbol(coinSymbol);
    setError('');
    setNotice('');
    try {
      await api('/account/payouts', {
        method: 'POST',
        body: JSON.stringify({ symbol: coinSymbol }),
      });
      setNotice(`Payout requested in ${coinSymbol}`);
      await Promise.all([loadEarnings(), loadPayouts()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusySymbol('');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Earnings &amp; payouts</h1>
          <p>Daily accrual per coin, balances and payout history.</p>
        </div>
        <div className="filter-row">
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Range">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} aria-label="Coin">
            <option value="ALL">All coins</option>
            {coins.map((coin) => (
              <option key={coin.symbol} value={coin.symbol}>
                {coin.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      {data ? (
        <>
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <h2>Daily earnings</h2>
                <p>
                  {formatUsd(data.totals.usd)} over the last {data.days} days
                </p>
              </div>
            </div>
            <TrendChart points={chartPoints} format={(value) => formatUsd(value, { compact: true })} emptyLabel="No earnings in this range" />
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>By coin</h2>
                <p>Earned and unpaid balance</p>
              </div>
            </div>

            {data.totals.byCoin.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Coin</th>
                      <th className="num">Earned</th>
                      <th className="num">Value</th>
                      <th className="num">Balance</th>
                      <th className="num">Threshold</th>
                      <th aria-label="Payout" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.totals.byCoin.map((row) => {
                      const coin = coinMap.get(row.symbol);
                      const threshold = coin?.threshold || 0;
                      const balance = data.balances[row.symbol]?.amount || 0;
                      const canPay = balance >= threshold && threshold > 0;
                      return (
                        <tr key={row.symbol}>
                          <td>
                            <span className="coin-inline">
                              <CoinBadge symbol={row.symbol} />
                              {row.symbol}
                            </span>
                          </td>
                          <td className="num mono">{formatAmount(row.amount, row.symbol)}</td>
                          <td className="num mono">{formatUsd(row.usd)}</td>
                          <td className="num mono">{formatAmount(balance, row.symbol)}</td>
                          <td className="num mono muted">{formatAmount(threshold, row.symbol)}</td>
                          <td className="num">
                            <button
                              type="button"
                              className="btn subtle tiny"
                              disabled={!canPay || busySymbol === row.symbol}
                              onClick={() => requestPayout(row.symbol)}
                              title={canPay ? 'Request payout' : `Balance below the ${threshold} ${row.symbol} threshold`}
                            >
                              {busySymbol === row.symbol ? 'Requesting…' : 'Request payout'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No earnings yet">Once your workers submit shares, daily earnings appear here.</EmptyState>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Daily ledger</h2>
                <p>Per coin, per day</p>
              </div>
            </div>
            {data.rows.length ? (
              <div className="table-wrap ledger">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Coin</th>
                      <th className="num">Hashrate</th>
                      <th className="num">Amount</th>
                      <th className="num">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={`${row.date}-${row.symbol}`}>
                        <td className="mono">{row.date}</td>
                        <td>{row.symbol}</td>
                        <td className="num mono">{formatHashrate(row.hashrate)}</td>
                        <td className="num mono">{formatAmount(row.amount, row.symbol)}</td>
                        <td className="num mono">{formatUsd(row.usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Nothing in this range.</p>
            )}
          </section>
        </>
      ) : (
        <div className="loading">Loading earnings…</div>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Payout history</h2>
            <p>Paid to your per-coin addresses</p>
          </div>
        </div>
        {payouts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Coin</th>
                  <th className="num">Amount</th>
                  <th className="num">Value</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="mono">{formatDateTime(payout.createdAt)}</td>
                    <td>{payout.symbol}</td>
                    <td className="num mono">{formatAmount(payout.amount, payout.symbol)}</td>
                    <td className="num mono">{formatUsd(payout.usd)}</td>
                    <td className="mono muted">{shortHash(payout.address, 10, 6)}</td>
                    <td>
                      <span className={`status ${payout.status}`}>{payout.status}</span>
                    </td>
                    <td className="mono muted">{payout.txHash ? shortHash(payout.txHash, 8, 6) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No payouts yet">Balances above the coin threshold can be paid out to your wallet.</EmptyState>
        )}
      </section>
    </>
  );
}
