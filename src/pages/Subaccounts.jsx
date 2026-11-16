import { useEffect, useState } from 'react';
import { api } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, formatHashrate } from '../lib/format.js';

export default function Subaccounts() {
  const [subaccounts, setSubaccounts] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/account/subaccounts')
      .then((data) => setSubaccounts(data.subaccounts))
      .catch((err) => setError(err.message));
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api('/account/subaccounts', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setSubaccounts(data.subaccounts);
      setName('');
      setNotice('Sub-account created');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const rename = async (subaccount) => {
    setError('');
    try {
      const data = await api(`/account/subaccounts/${subaccount.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName }),
      });
      setSubaccounts(data.subaccounts);
      setEditingId(null);
      setNotice('Sub-account renamed');
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (subaccount) => {
    if (!window.confirm(`Delete sub-account ${subaccount.name} and its ${subaccount.workers} worker(s)?`)) return;
    setError('');
    try {
      const data = await api(`/account/subaccounts/${subaccount.id}`, { method: 'DELETE' });
      setSubaccounts(data.subaccounts);
      setNotice('Sub-account deleted');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sub-accounts</h1>
          <p>Split sites, farms or customers under one login. Each gets its own puid.</p>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      <div className="workers-grid">
        <form className="card form-card" onSubmit={create}>
          <h2>New sub-account</h2>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="eu-farm-01"
              required
              minLength={3}
              maxLength={20}
            />
            <small className="muted">3–20 characters: letters, numbers, . _ -</small>
          </label>
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Creating…' : 'Create sub-account'}
          </button>
        </form>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Your sub-accounts</h2>
              <p>{subaccounts.length} total</p>
            </div>
          </div>

          {subaccounts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="num">puid</th>
                    <th className="num">Workers</th>
                    <th className="num">Hashrate</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subaccounts.map((subaccount) => (
                    <tr key={subaccount.id}>
                      <td>
                        {editingId === subaccount.id ? (
                          <div className="inline-edit">
                            <input
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              aria-label="Sub-account name"
                            />
                            <button type="button" className="btn primary tiny" onClick={() => rename(subaccount)}>
                              Save
                            </button>
                            <button type="button" className="btn subtle tiny" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <strong>{subaccount.name}</strong>
                            {subaccount.isDefault ? <span className="tag accent">main</span> : null}
                          </>
                        )}
                      </td>
                      <td className="num mono">{subaccount.puid}</td>
                      <td className="num mono">
                        {subaccount.online}/{subaccount.workers}
                      </td>
                      <td className="num mono">{formatHashrate(subaccount.hashrateHs)}</td>
                      <td className="muted">{formatDate(subaccount.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn subtle tiny"
                            onClick={() => {
                              setEditingId(subaccount.id);
                              setEditingName(subaccount.name);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="btn subtle tiny danger"
                            disabled={subaccount.isDefault}
                            onClick={() => remove(subaccount)}
                          >
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
            <EmptyState title="No sub-accounts yet">Create one to split workers per site.</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
