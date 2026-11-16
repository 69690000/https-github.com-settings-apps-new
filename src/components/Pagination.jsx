export default function Pagination({ page, pageSize, total, loading, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <span className="muted">
        Showing {start.toLocaleString('en-US')}–{end.toLocaleString('en-US')} of{' '}
        {total.toLocaleString('en-US')}
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn ghost sm" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <span className="page-indicator">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn ghost sm"
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
