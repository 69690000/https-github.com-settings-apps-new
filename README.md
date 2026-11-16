# CloverPool

Multi-currency mining pool web app: browse every coin pool, register an account, manage workers and
sub-accounts, and track daily earnings and payouts.

- **Frontend** — React + Vite (`src/`), dark pool dashboard with live-feed styling.
- **API** — Express + SQLite (`server/`), cookie sessions, scrypt password hashing.

## Coin pools

BTC, BCH, BSV, LTC, DOGE, ETC, ZIL, ETHW, ETHF, KAS, DCR, CKB, DASH, ZEC, GRIN, ELA and NMC, each with
algorithm, payment model (FPPS/PPLNS), fee, payout threshold, stratum servers and block history.

## Run locally

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Web: http://localhost:3000 — API: http://localhost:8000/api.

## Demo account

`demo@cloverpool.demo` / `demo1234` — pre-loaded with sub-accounts, workers, payouts and payout addresses.

> Pool statistics, hashrates and balances in this environment are simulated demo data.
