import { useEffect, useRef, useState } from 'react';

export default function UploadDialog({ onClose, onImport }) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const readFile = async (file) => {
    if (!file) return;
    try {
      const content = await file.text();
      setCsvText(content);
      setFileName(file.name);
      setError('');
    } catch {
      setError('Could not read that file.');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!csvText.trim()) {
      setError('Choose a CSV file or paste its contents first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onImport(csvText);
    } catch (err) {
      setError(err.message || 'Import failed.');
      setBusy(false);
    }
  };

  const rowCount = csvText ? Math.max(0, csvText.trim().split(/\r?\n/).length - 1) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import transactions"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal-head">
          <div>
            <h2>Import transactions</h2>
            <p className="muted small">CSV with a header row — hash, timestamp, from, to, amount, fee, status, block.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close import dialog">
            ✕
          </button>
        </div>

        <div
          className={dragging ? 'dropzone dragging' : 'dropzone'}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            readFile(event.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden-input"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          <p className="dropzone-title">{fileName || 'Drop a CSV here or click to browse'}</p>
          <p className="muted small">
            {csvText ? `${rowCount.toLocaleString('en-US')} data row${rowCount === 1 ? '' : 's'} detected` : 'Duplicates by hash are skipped automatically'}
          </p>
        </div>

        <label className="paste-label">
          <span className="muted small">…or paste CSV text</span>
          <textarea
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setFileName('');
              setError('');
            }}
            rows={6}
            spellCheck={false}
            placeholder={'hash,timestamp,from,to,amount,fee,status,block\n3f2a…,2026-11-16T04:12:00Z,bc1q…,bc1q…,125000,420,confirmed,870412'}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || !csvText.trim()}>
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>
    </div>
  );
}
