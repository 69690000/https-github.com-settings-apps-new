import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Logo from './Logo.jsx';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand">
          <Logo />
          <span>
            Clover<strong>Pool</strong>
          </span>
        </Link>

        <nav className="site-nav">
          <NavLink to="/" end>
            Pools
          </NavLink>
          <NavLink to="/account/workers">Workers</NavLink>
          <NavLink to="/account/earnings">Earnings</NavLink>
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link className="btn ghost small" to="/account">
                Dashboard
              </Link>
              <button type="button" className="btn subtle small" onClick={() => logout()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn ghost small" to="/login">
                Sign in
              </Link>
              <Link className="btn primary small" to="/register">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
