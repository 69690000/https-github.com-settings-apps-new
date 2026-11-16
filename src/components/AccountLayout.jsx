import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const LINKS = [
  { to: '/account', label: 'Dashboard', end: true },
  { to: '/account/workers', label: 'Workers' },
  { to: '/account/subaccounts', label: 'Sub-accounts' },
  { to: '/account/earnings', label: 'Earnings & payouts' },
  { to: '/account/settings', label: 'Settings' },
];

export default function AccountLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="shell page-pad loading">Loading your account…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="shell page-pad account-shell">
      <aside className="account-sidebar">
        <div className="account-identity">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <nav className="account-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="account-body">
        <Outlet />
      </div>
    </div>
  );
}
