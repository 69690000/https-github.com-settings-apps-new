export default function EmptyState({ onUpload, onLoadSample, sampleLoading }) {
  return (
    <section className="empty">
      <div className="empty-icon" aria-hidden="true">₿</div>
      <h2>No transactions yet</h2>
      <p className="muted">
        Upload a CSV export to explore it here, or load a sample set to see how the viewer works.
      </p>
      <div className="empty-actions">
        <button type="button" className="btn primary" onClick={onUpload}>
          Upload CSV
        </button>
        <button type="button" className="btn ghost" onClick={onLoadSample} disabled={sampleLoading}>
          {sampleLoading ? 'Loading…' : 'Load sample data'}
        </button>
      </div>
      <div className="empty-schema">
        <p className="muted small">Recognised columns (header names are flexible):</p>
        <code>hash, timestamp, from, to, amount, fee, status, block</code>
        <p className="muted small">
          Amounts are read as satoshis unless the header says <code>btc</code>. Timestamps accept ISO
          dates or Unix seconds/milliseconds.
        </p>
      </div>
    </section>
  );
}
