import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import CoinBadge from '../components/CoinBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatHashrate, timeAgo, UNIT_FACTOR } from '../lib/format.js';

export default function Workers() {
  const [coins, setCoins] = useState([]);
  const [subaccounts, setSubaccounts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [filters, setFilters] = useState({ symbol: '', subaccount: '' });
  const [form, setForm] = useState({ name: '', symbol: 'BTC', rate: '', subaccountId: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadWorkers = (nextFilters = filters) => {
    const params = new URLSearchParams();
    if (nextFilters.symbol) params.set('symbol', nextFilters.symbol);
    if (nextFilters.subaccount) params.set('subaccount', nextFilters.subaccount);
    return api(`/account/workers?${params.toString()}`).then((data) => setWorkers(data.workers));
  };

  useEffect(() => {
    Promise.all([api('/coins'), api('/account/subaccounts'), api('/account/workers')])
      .then(([coinData, subData, workerData]) => {
        setCoins(coinData.coins);
        setSubaccounts(subData.subaccounts);
        setWorkers(workerData.workers);
        const main = subData.subaccounts[0];
        setForm((current) => ({ ...current, symbol: coinData.coins[0]?.symbol || 'BTC', subaccountId: main ? String(main.id) : '' }));
      })
      .catch((err) => setError(err.message));
  }, []);

  const selectedCoin = useMemo(
    () => coins.find((coin) => coin.symbol === form.symbol),
    [coins, form.symbol],
  );
  const unit = selectedCoin?.revenueUnit || 'TH';

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadWorkers(next).catch((err) => setError(err.message));
  };

  const addWorker = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const hashrateHs = Number(form.rate) * (UNIT_FACTOR[unit] || 1e12);
      await api('/account/workers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          symbol: form.symbol,
          hashrateHs,
          subaccountId: Number(form.subaccountId),
        }),
      });
      setForm({ ...form, name: '', rate: '' });
      setNotice('Worker added');
      await loadWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (worker) => {
    setError('');
    try {
      const next = worker.status === 'online' ? 'offline' : 'online';
      await api(`/account/workers/${worker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      await loadWorkers();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveName = async (worker) => {
    setError('');
    try {
      await api(`/account/workers/${worker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName }),
      });
      setEditingId(null);
      setNotice('Worker renamed');
      await loadWorkers();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeWorker = async (worker) => {
    if (!window.confirm(`Delete worker ${worker.name}? Its earnings history is not affected.`)) return;
    setError('');
    try {
      await api(`/account/workers/${worker.id}`, { method: 'DELETE' });
      setNotice('Worker deleted');
      await loadWorkers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Workers</h1>
          <p>Every rig connected to your sub-accounts.</p>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      <div className="workers-grid">
        <form className="card form-card" onSubmit={addWorker}>
          <h2>Add a worker</h2>
          <label className="field">
            <span>Worker name</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="btc-rig-01"
              required
              minLength={2}
            />
          </label>
          <label className="field">
            <span>Coin</span>
            <select value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}>
              {coins.map((coin) => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.symbol} — {coin.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Hashrate</span>
            <div className="input-unit">
              <input
                type="number"
                step="any"
                min="0"
                value={form.rate}
                onChange={(event) => setForm({ ...form, rate: event.target.value })}
                placeholder="120"
                required
              />
              <span>{unit}/s</span>
            </div>
          </label>
          <label className="field">
            <span>Sub-account</span>
            <select
              value={form.subaccountId}
              onChange={(event) => setForm({ ...form, subaccountId: event.target.value })}
              required
            >
              {subaccounts.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (puid {sub.puid})
                </option>
              ))}
            </select>
          </label>
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Adding…' : 'Add worker'}
          </button>
        </form>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>All workers</h2>
              <p>{workers.length} shown</p>
            </div>
            <div className="filter-row">
              <select value={filters.symbol} onChange={(event) => changeFilter('symbol', event.target.value)} aria-label="Filter by coin">
                <option value="">All coins</option>
                {coins.map((coin) => (
                  <option key={coin.symbol} value={coin.symbol}>
                    {coin.symbol}
                  </option>
                ))}
              </select>
              <select
                value={filters.subaccount}
                onChange={(event) => changeFilter('subaccount', event.target.value)}
                aria-label="Filter by sub-account"
              >
                <option value="">All sub-accounts</option>
                {subaccounts.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {workers.length ? (
            <div className="table-wrap">
              <table className="data-table workers-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Coin</th>
                    <th>Sub-account</th>
                    <th className="num">Hashrate</th>
                    <th>Status</th>
                    <th>Last share</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id}>
                      <td>
                        {editingId === worker.id ? (
                          <div className="inline-edit">
                            <input
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              aria-label="Worker name"
                            />
                            <button type="button" className="btn primary tiny" onClick={() => saveName(worker)}>
                              Save
                            </button>
                            <button type="button" className="btn subtle tiny" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <strong className="mono">{worker.name}</strong>
                        )}
                      </td>
                      <td>
                        <span className="coin-inline">
                          <CoinBadge symbol={worker.symbol} size="sm" />
                          {worker.symbol}
                        </span>
                      </td>
                      <td>{worker.subaccountName}</td>
                      <td className="num mono">{formatHashrate(worker.hashrateHs)}</td>
                      <td>
                        <button
                          type="button"
                          className={`status ${worker.status}`}
                          onClick={() => toggleStatus(worker)}
                          title="Toggle worker status"
                        >
                          {worker.status}
                        </button>
                      </td>
                      <td className="muted">{timeAgo(worker.lastShareAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn subtle tiny"
                            onClick={() => {
                              setEditingId(worker.id);
                              setEditingName(worker.name);
                            }}
                          >
                            Rename
                          </button>
                          <button type="button" className="btn subtle tiny danger" onClick={() => removeWorker(worker)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No workers match">Add a worker or clear the filters to see your rigs.</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
