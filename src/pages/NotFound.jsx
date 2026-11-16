import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="shell page-pad not-found">
      <h1>Page not found</h1>
      <p className="muted">That page does not exist. Try the coin pools overview.</p>
      <Link className="btn primary" to="/">
        Back to pools
      </Link>
    </div>
  );
}
