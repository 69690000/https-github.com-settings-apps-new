import { useEffect, useState } from 'react';
import { formatBtc, formatSats, formatTime, relativeTime } from '../lib/format';

function Row({ label, children, mono }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{children}</dd>
    </div>
  );
}

export default function TxDrawer({ tx, onClose, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(tx.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <span className={`badge ${tx.status}`}>{tx.status}</span>
            <h2>Transaction</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>

        <div className="drawer-amount">
          <p className="stat-label">Amount</p>
          <p className="drawer-btc">{formatBtc(tx.amount)}</p>
          <p className="muted mono">{formatSats(tx.amount)}</p>
        </div>

        <dl className="details">
          <Row label="Time">
            {formatTime(tx.ts)} <span className="muted">· {relativeTime(tx.ts)}</span>
          </Row>
          <Row label="Fee" mono>
            {formatSats(tx.fee)}
          </Row>
          <Row label="Block" mono>
            {tx.block ? `#${tx.block.toLocaleString('en-US')}` : 'Not mined'}
          </Row>
          <Row label="From" mono>
            {tx.from_addr || '—'}
          </Row>
          <Row label="To" mono>
            {tx.to_addr || '—'}
          </Row>
          <Row label="Source">
            <span className="badge neutral">{tx.source}</span>
          </Row>
        </dl>

        <div className="hash-block">
          <p className="stat-label">Hash</p>
          <p className="mono hash-full">{tx.hash}</p>
          <button type="button" className="btn ghost sm" onClick={copyHash}>
            {copied ? 'Copied' : 'Copy hash'}
          </button>
        </div>

        <div className="drawer-foot">
          {confirming ? (
            <div className="confirm-inline">
              <span>Delete this transaction?</span>
              <button type="button" className="btn danger-solid sm" onClick={() => onDelete(tx)}>
                Delete
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost danger sm" onClick={() => setConfirming(true)}>
              Delete transaction
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
