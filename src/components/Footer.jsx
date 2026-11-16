import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <Logo size={22} />
            <span>
              Clover<strong>Pool</strong>
            </span>
          </Link>
          <p>Multi-currency mining pool. Daily payouts, FPPS and PPLNS, 17 coin networks.</p>
        </div>
        <div className="footer-col">
          <h4>Mining</h4>
          <Link to="/">Coin pools</Link>
          <Link to="/account/workers">Workers</Link>
          <Link to="/account/earnings">Earnings</Link>
        </div>
        <div className="footer-col">
          <h4>Account</h4>
          <Link to="/account">Dashboard</Link>
          <Link to="/account/subaccounts">Sub-accounts</Link>
          <Link to="/account/settings">Payout settings</Link>
        </div>
      </div>
      <div className="shell footer-note">
        <span>© {new Date().getFullYear()} CloverPool</span>
        <span>Demo environment — pool statistics and balances are simulated.</span>
      </div>
    </footer>
  );
}
