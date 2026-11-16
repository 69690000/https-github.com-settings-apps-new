const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Largest amount' },
  { value: 'amount_asc', label: 'Smallest amount' },
];

export default function Toolbar({ search, onSearch, status, onStatus, sort, onSort, total, loading }) {
  return (
    <div className="toolbar">
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search hash or address"
          aria-label="Search transactions by hash or address"
        />
      </div>

      <div className="segmented" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={status === option.value ? 'segment active' : 'segment'}
            aria-pressed={status === option.value}
            onClick={() => onStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <span className="result-count">{loading ? 'Loading…' : `${total.toLocaleString('en-US')} results`}</span>
        <select value={sort} onChange={(event) => onSort(event.target.value)} aria-label="Sort transactions">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
