# Agent notes — CloverPool

Multi-coin mining pool web app: React + Vite frontend, Express + SQLite API.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- Web (host port 3000) → Vite dev server in `web`, proxies `/api` to the `api` service.
- API (container port 8000) → Express, SQLite at `/data/cloverpool.db` (compose volume `clover-data`).

Single-origin wiring is deliberate: the session cookie is `HttpOnly; SameSite=Lax`, so the browser
must only ever talk to port 3000. Do not point the frontend at a second host port.

## Data

- `server/coins.js` is the coin catalog; `server/db.js` upserts it into the `coins`/`servers` tables on every boot.
- Hashrate history, pool blocks and the demo account are seeded once, only when their tables are empty.
  Delete the `clover-data` volume to re-seed from scratch.
- Pool statistics, block hashes and earnings are simulated demo data — there is no live pool backend.
- Demo login: `demo@cloverpool.demo` / `demo1234` (main sub-account plus 8 workers, payouts and addresses).
- Earnings are computed on the fly (deterministic jitter per worker/day) from each worker's hashrate
  and its coin's pool rate; they are not stored.

## Verify

```bash
curl -s localhost:3000/api/health            # {"ok":true}
curl -s localhost:3000/api/coins | head -c 300
```

There is no test suite; verify UI flows against the running stack. Auth is cookie-based, so curl needs
`-c/-b` around `POST /api/auth/login` to reach `/api/account/*`.

## Gotchas

- `better-sqlite3` is native; `npm install` runs on container start (node:22 has the toolchain).
- Vite must bind `0.0.0.0`; external hosts are allowed through `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`,
  which compose passes in bare.
