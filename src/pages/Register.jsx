import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted">One account for every coin pool, with a main sub-account ready to go.</p>

        <label className="field">
          <span>Account name</span>
          <input value={form.name} onChange={update('name')} autoComplete="name" required minLength={2} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <small className="muted">At least 8 characters.</small>
        </label>

        {error ? <p className="alert error">{error}</p> : null}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="switch">
          Already mining with us? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
