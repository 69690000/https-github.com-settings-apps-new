# SatoshiBench transaction viewer

React (Vite) single-page viewer for Bitcoin-style transaction CSVs, with a small
Express + SQLite API behind it.

## Run it (sandbox)

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- `web` — Vite dev server, host port **3000** (container 5173). The only public entry point.
- `api` — Express on internal port 8000, reached through Vite's `/api` proxy (single origin, no CORS).
- Both services `npm install` on start from the bind-mounted checkout, so dependency
  changes only need a restart (`docker compose -f docker-compose.base44.yml restart web`).
- SQLite data lives in the named volume `tx-data` (`/data/tx.db`). Recreating containers
  keeps data; `docker compose ... down -v` wipes it. The API seeds 48 sample rows on first
  boot when the table is empty so the viewer is never blank.

## Things that are easy to trip over

- **No build step in the sandbox.** The dev server serves live source; a production
  `vite build` is not part of the compose flow, so edits appear without rebuilding images.
- **Host/origin allowlist.** `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed from the
  platform so Vite accepts the preview hostname. `BASE44_PREVIEW_MODE=1` additionally sets
  the HMR socket to `wss` on port 443 in `vite.config.js` because the preview proxy is HTTPS;
  with the variable unset, Vite's own HMR defaults are used.
- **API dev server** runs `node --watch`, so server edits restart it automatically.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | health probe used by the compose healthcheck |
| GET | `/api/transactions?search=&status=&sort=&page=&pageSize=` | paginated list (sort: `newest`, `oldest`, `amount_desc`, `amount_asc`) |
| GET | `/api/stats` | totals, status counts, unique addresses, time range |
| POST | `/api/transactions/import` | `{ "csv": "<text>" }` — parses and inserts, dedupes by hash |
| POST | `/api/sample` | insert the demo dataset |
| DELETE | `/api/transactions/:id` | delete one row |
| DELETE | `/api/transactions` | delete everything |

## CSV format

Header row required; names are matched loosely (`hash`/`txid`/`tx_hash`, `from`/`sender`,
`to`/`receiver`, `value`, `fee`, `status`, `block`/`block_height`, `timestamp`/`date`).
Amounts are satoshis unless the header contains `btc`. Timestamps accept ISO strings,
Unix seconds or Unix milliseconds. Duplicate hashes are ignored on import.

## Checks

There is no test suite yet. Verify by hand:
`curl -s localhost:3000/api/stats` and importing a CSV through the UI.
