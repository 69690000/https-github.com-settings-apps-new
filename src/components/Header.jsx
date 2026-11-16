export default function Header({ onUpload, onRefresh, onRequestClear, onLoadSample, sampleLoading, loading }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">₿</span>
          <div>
            <h1>SatoshiBench</h1>
            <p>Transaction viewer</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost" onClick={onRefresh} disabled={loading} title="Reload transactions">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="btn ghost" onClick={onLoadSample} disabled={sampleLoading}>
            {sampleLoading ? 'Adding…' : 'Sample data'}
          </button>
          <button type="button" className="btn ghost danger" onClick={onRequestClear}>
            Clear all
          </button>
          <button type="button" className="btn primary" onClick={onUpload}>
            Upload CSV
          </button>
        </div>
      </div>
    </header>
  );
}
