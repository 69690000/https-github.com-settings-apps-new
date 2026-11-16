import { formatBtc, formatTime, shortAddress, shortHash } from '../lib/format';

export default function TxTable({ items, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-time">Time</th>
            <th>Transaction</th>
            <th className="col-route">From → To</th>
            <th className="num">Amount</th>
            <th className="num col-fee">Fee</th>
            <th>Status</th>
            <th className="num col-block">Block</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr
              key={tx.id}
              tabIndex={0}
              onClick={() => onSelect(tx)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(tx);
                }
              }}
            >
              <td className="muted nowrap col-time">{formatTime(tx.ts)}</td>
              <td className="mono nowrap">{shortHash(tx.hash)}</td>
              <td className="mono addresses col-route">
                <span title={tx.from_addr || ''}>{shortAddress(tx.from_addr)}</span>
                <span className="arrow" aria-hidden="true">→</span>
                <span title={tx.to_addr || ''}>{shortAddress(tx.to_addr)}</span>
              </td>
              <td className="num">
                <span className="amount-main">{formatBtc(tx.amount)}</span>
                <span className="amount-sub">{Math.round(tx.amount).toLocaleString('en-US')} sats</span>
              </td>
              <td className="num muted mono nowrap col-fee">{Math.round(tx.fee).toLocaleString('en-US')}</td>
              <td>
                <span className={`badge ${tx.status}`}>{tx.status}</span>
              </td>
              <td className="num mono muted nowrap col-block">
                {tx.block ? `#${tx.block.toLocaleString('en-US')}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
