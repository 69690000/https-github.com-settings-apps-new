import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearAll,
  deleteTransaction,
  fetchStats,
  fetchTransactions,
  importCsv,
  loadSample,
} from './lib/api';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Toolbar from './components/Toolbar';
import TxTable from './components/TxTable';
import Pagination from './components/Pagination';
import TxDrawer from './components/TxDrawer';
import UploadDialog from './components/UploadDialog';
import EmptyState from './components/EmptyState';
import Toasts from './components/Toasts';

const PAGE_SIZE = 25;

export default function App() {
  const [rows, setRows] = useState({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const requestId = useRef(0);

  const notify = useCallback((message, tone = 'ok') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4200);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const refresh = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    try {
      const [txPage, txStats] = await Promise.all([
        fetchTransactions({ search: query, status, sort, page, pageSize: PAGE_SIZE }),
        fetchStats(),
      ]);
      if (id !== requestId.current) return;
      setRows(txPage);
      setStats(txStats);
      setError('');
    } catch (err) {
      if (id === requestId.current) setError(err.message || 'Could not reach the API.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, status, sort, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A delete or filtered refresh can leave us past the last page.
  useEffect(() => {
    if (loading || rows.items.length || !rows.total || page === 1) return;
    setPage(Math.max(1, Math.ceil(rows.total / PAGE_SIZE)));
  }, [loading, rows, page]);

  const handleDelete = async (tx) => {
    try {
      await deleteTransaction(tx.id);
      setSelected(null);
      notify('Transaction deleted.');
      await refresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleImport = async (csvText) => {
    const result = await importCsv(csvText);
    const parts = [`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`];
    if (result.duplicates) parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'} skipped`);
    if (result.skippedRows) parts.push(`${result.skippedRows} empty row${result.skippedRows === 1 ? '' : 's'} skipped`);
    setUploadOpen(false);
    setPage(1);
    notify(`${parts.join(' · ')}.`);
    await refresh();
  };

  const handleSample = async () => {
    setSampleLoading(true);
    try {
      const result = await loadSample();
      notify(
        result.imported
          ? `Added ${result.imported} sample transactions.`
          : 'Sample transactions are already loaded.',
        result.imported ? 'ok' : 'info',
      );
      await refresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSampleLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      const result = await clearAll();
      setConfirmClear(false);
      setSelected(null);
      setPage(1);
      notify(`Cleared ${result.deleted} transaction${result.deleted === 1 ? '' : 's'}.`, 'info');
      await refresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const isEmpty = !loading && rows.total === 0 && !query && status === 'all';
  const noMatches = !loading && rows.items.length === 0 && !isEmpty;

  return (
    <div className="app">
      <Header
        onUpload={() => setUploadOpen(true)}
        onRefresh={refresh}
        onRequestClear={() => setConfirmClear(true)}
        onLoadSample={handleSample}
        sampleLoading={sampleLoading}
        loading={loading}
      />

      {confirmClear ? (
        <div className="confirm-bar">
          <div className="container confirm-inner">
            <span>
              Delete all {stats?.count ? StatsLabel(stats.count) : 'transactions'}? This cannot be undone.
            </span>
            <div className="confirm-actions">
              <button type="button" className="btn danger-solid sm" onClick={handleClear}>
                Delete all
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="container">
        <StatsBar stats={stats} />

        <section className="panel">
          <Toolbar
            search={search}
            onSearch={setSearch}
            status={status}
            onStatus={(value) => {
              setStatus(value);
              setPage(1);
            }}
            sort={sort}
            onSort={(value) => {
              setSort(value);
              setPage(1);
            }}
            total={rows.total}
            loading={loading}
          />

          {error ? (
            <div className="error-banner">
              <span>{error}</span>
              <button type="button" className="btn ghost sm" onClick={refresh}>
                Retry
              </button>
            </div>
          ) : null}

          {isEmpty ? (
            <EmptyState
              onUpload={() => setUploadOpen(true)}
              onLoadSample={handleSample}
              sampleLoading={sampleLoading}
            />
          ) : noMatches ? (
            <div className="no-matches">
              <p>No transactions match these filters.</p>
              <button type="button" className="btn ghost sm" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <TxTable items={rows.items} onSelect={setSelected} />
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={rows.total}
                loading={loading}
                onChange={setPage}
              />
            </>
          )}
        </section>

        <p className="footnote muted small">
          Amounts in satoshis with BTC equivalents. Imported rows are stored in this app's SQLite database.
        </p>
      </main>

      {selected ? <TxDrawer tx={selected} onClose={() => setSelected(null)} onDelete={handleDelete} /> : null}
      {uploadOpen ? <UploadDialog onClose={() => setUploadOpen(false)} onImport={handleImport} /> : null}
      <Toasts items={toasts} />
    </div>
  );
}

function StatsLabel(count) {
  return `${count.toLocaleString('en-US')} transaction${count === 1 ? '' : 's'}`;
}
