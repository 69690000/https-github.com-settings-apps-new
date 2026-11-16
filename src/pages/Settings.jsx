import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatDate } from '../lib/format.js';

export default function Settings() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ name: '' });
  const [alerts, setAlerts] = useState({ enabled: true, rateTh: '0' });
  const [addresses, setAddresses] = useState([]);
  const [coins, setCoins] = useState([]);
  const [addressForm, setAddressForm] = useState({ symbol: 'BTC', address: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name });
    setAlerts({
      enabled: user.alertEnabled,
      rateTh: String(Number(((user.alertHashrateHs || 0) / 1e12).toFixed(2))),
    });
  }, [user]);

  useEffect(() => {
    Promise.all([api('/account/addresses'), api('/coins')])
      .then(([addressData, coinData]) => {
        setAddresses(addressData.addresses);
        setCoins(coinData.coins);
      })
      .catch((err) => setError(err.message));
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy('profile');
    setError('');
    setNotice('');
    try {
      await api('/account/settings', { method: 'PATCH', body: JSON.stringify({ name: profile.name }) });
      await refresh();
      setNotice('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveAlerts = async (event) => {
    event.preventDefault();
    setBusy('alerts');
    setError('');
    setNotice('');
    try {
      await api('/account/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          alertEnabled: alerts.enabled,
          alertHashrateHs: Number(alerts.rateTh || 0) * 1e12,
        }),
      });
      await refresh();
      setNotice('Alert settings saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setBusy('address');
    setError('');
    setNotice('');
    try {
      await api(`/account/addresses/${addressForm.symbol}`, {
        method: 'PUT',
        body: JSON.stringify({ address: addressForm.address }),
      });
      const data = await api('/account/addresses');
      setAddresses(data.addresses);
      setAddressForm({ ...addressForm, address: '' });
      setNotice(`${addressForm.symbol} payout address saved`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  if (!user) return null;
  const savedAddress = (symbol) => addresses.find((row) => row.symbol === symbol)?.address || '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Profile, hashrate alerts and payout addresses.</p>
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      <div className="workers-grid">
        <form className="card form-card" onSubmit={saveProfile}>
          <h2>Profile</h2>
          <label className="field">
            <span>Account name</span>
            <input value={profile.name} onChange={(event) => setProfile({ name: event.target.value })} required minLength={2} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
            <small className="muted">Member since {formatDate(user.createdAt)}</small>
          </label>
          <button className="btn primary block" disabled={busy === 'profile'}>
            {busy === 'profile' ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form className="card form-card" onSubmit={saveAlerts}>
          <h2>Hashrate alerts</h2>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={alerts.enabled}
              onChange={(event) => setAlerts({ ...alerts, enabled: event.target.checked })}
            />
            <span>Email me when total hashrate drops below</span>
          </label>
          <label className="field">
            <span>Threshold</span>
            <div className="input-unit">
              <input
                type="number"
                step="any"
                min="0"
                value={alerts.rateTh}
                onChange={(event) => setAlerts({ ...alerts, rateTh: event.target.value })}
              />
              <span>TH/s</span>
            </div>
          </label>
          <button className="btn primary block" disabled={busy === 'alerts'}>
            {busy === 'alerts' ? 'Saving…' : 'Save alerts'}
          </button>
        </form>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Payout addresses</h2>
            <p>One address per coin. Payouts run daily once the balance passes the threshold.</p>
          </div>
        </div>

        <form className="address-form" onSubmit={saveAddress}>
          <label className="field">
            <span>Coin</span>
            <select
              value={addressForm.symbol}
              onChange={(event) =>
                setAddressForm({ symbol: event.target.value, address: savedAddress(event.target.value) })
              }
            >
              {coins.map((coin) => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.symbol} — {coin.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>Wallet address</span>
            <input
              value={addressForm.address}
              onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })}
              placeholder={savedAddress(addressForm.symbol) || 'Paste your address'}
              required
              minLength={10}
            />
          </label>
          <button className="btn primary" disabled={busy === 'address'}>
            {busy === 'address' ? 'Saving…' : 'Save address'}
          </button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Coin</th>
                <th>Address</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {addresses.length ? (
                addresses.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <strong>{row.symbol}</strong>
                    </td>
                    <td className="mono">{row.address}</td>
                    <td className="muted">{formatDate(row.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="table-empty">
                    No payout addresses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
