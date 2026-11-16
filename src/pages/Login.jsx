import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from || '/account', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="muted">Access your workers, earnings and payouts.</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="alert error">{error}</p> : null}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="switch">
          New to CloverPool? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-hint">
          <strong>Demo account</strong>
          <span>demo@cloverpool.demo · demo1234</span>
          <button
            type="button"
            className="btn subtle tiny"
            onClick={() => {
              setEmail('demo@cloverpool.demo');
              setPassword('demo1234');
            }}
          >
            Fill demo credentials
          </button>
        </div>
      </form>
    </div>
  );
}
