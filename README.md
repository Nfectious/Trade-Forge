# TradeForge

**Paper-trade crypto with real-time prices. Compete in contests. Track your performance.**

TradeForge is a full-stack crypto paper trading platform with live WebSocket price feeds from Binance, Bybit, and Kraken, portfolio management, a contest/leaderboard system, and multiple account tiers. Built for learning crypto trading without risking real money.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

---

## Features

- **Live prices** — WebSocket feeds from Binance, Bybit, and Kraken with Redis caching and automatic reconnect
- **Paper trading** — market and limit orders with real-time portfolio valuation and P&L tracking
- **Candlestick charts** — OHLC data proxied from Binance and Kraken REST APIs
- **Contest system** — time-limited trading competitions with leaderboards and rankings
- **Account tiers** — Free ($10k), Pro ($25k), Elite ($100k), Valkyrie ($500k) virtual starting balances
- **JWT auth** — short-lived access tokens (15 min) + httpOnly refresh cookies (7 days), Argon2id password hashing
- **Admin panel** — user management, ban/unban, contest creation (IP-restricted at Nginx layer)
- **Email verification** — optional SMTP integration (Resend, Gmail, SendGrid)
- **Rate limiting** — per-IP limits on auth and trading endpoints via SlowAPI

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI 0.115, Python 3.12, Gunicorn + Uvicorn (2 workers) |
| Database | PostgreSQL 16 (UUID PKs, DB triggers, row-level locking) |
| Cache | Redis 7 (price cache, rate limiting, sessions) |
| Auth | JWT access tokens + httpOnly refresh cookies, Argon2id |
| Prices | WebSocket feeds: Binance, Bybit, Kraken |
| Infra | Docker Compose, multi-stage builds, Nginx reverse proxy |

---

## Prerequisites

- Docker and Docker Compose v2
- Git
- 4 GB RAM minimum (8 GB recommended)
- Ports 3001 and 8001 available (or adjust in compose files)

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/Nfectious/Trade-Forge.git
cd Trade-Forge
cp .env.example .env.production
```

### 2. Fill in required secrets

Open `.env.production` and fill in all `your_value_here` fields. Generate secure values for passwords and keys:

```bash
# DB_PASSWORD and REDIS_PASSWORD
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# JWT_SECRET_KEY
openssl rand -hex 64
```

Then update `DATABASE_URL` and `REDIS_URL` with the passwords you generated:

```
DATABASE_URL=postgresql+asyncpg://YOUR_DB_USER:YOUR_DB_PASSWORD@postgres:5432/crypto_platform
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis:6379/0
```

### 3. Start services

**Development:**
```bash
docker compose up -d
```

**Production (with resource limits and log rotation):**
```bash
docker compose -f docker-compose.prod.yml up -d
```

Or use the deployment script (runs pre-flight checks, backups, and health verification):
```bash
sudo ./scripts/deploy.sh
```

### 4. Verify

```bash
curl http://localhost:8001/health
# {"status":"healthy","services":{"redis":"up","websocket_feeds":"up"}}
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8001 |
| API Docs (Swagger) | http://localhost:8001/docs |
| API Docs (ReDoc) | http://localhost:8001/redoc |

---

## Project Structure

```
Trade-Forge/
├── docker-compose.yml           # Development services
├── docker-compose.prod.yml      # Production (resource limits, log rotation)
├── .env.example                 # Environment template — copy to .env.production
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── gunicorn.conf.py         # 2 workers, UvicornWorker
│   └── app/
│       ├── main.py              # FastAPI app, middleware, startup/shutdown
│       ├── core/
│       │   ├── config.py        # Pydantic settings
│       │   ├── security.py      # JWT encode/decode, Argon2id hashing
│       │   ├── database.py      # Async SQLModel session factory
│       │   ├── dependencies.py  # get_current_user, require_admin
│       │   ├── redis.py         # Shared Redis client
│       │   └── websocket_manager.py  # Exchange WS connections + reconnect
│       ├── models/
│       │   ├── user.py          # User, UserLogin, UserCreate
│       │   ├── trade.py         # TradingPair, Order, Trade (SQLAlchemy ORM)
│       │   ├── portfolio.py     # Portfolio, PortfolioHolding
│       │   ├── wallet.py        # VirtualWallet, WalletTransaction
│       │   └── contest.py       # Contest, ContestParticipant, schemas
│       ├── api/
│       │   ├── auth.py          # /auth/* (register, login, refresh, me)
│       │   ├── trading.py       # /trading/* (portfolio, orders, history)
│       │   ├── market.py        # /market/* (prices, klines, WebSocket)
│       │   ├── contests.py      # /contests/* (list, join, leaderboard)
│       │   ├── wallet.py        # /wallet/* (balance)
│       │   ├── users.py         # /users/*
│       │   └── admin.py         # /admin/* (IP-restricted via Nginx)
│       └── services/
│           ├── trade_executor.py        # Order creation, balance validation
│           ├── portfolio_calculator.py  # Real-time portfolio valuation
│           └── email_service.py         # SMTP email sending
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── lib/
│   │   └── api.ts               # Axios client with interceptors + token refresh
│   ├── hooks/
│   │   └── useSelectedSymbols.ts
│   ├── components/
│   │   ├── CandlestickChart.jsx
│   │   ├── LivePrice.jsx
│   │   ├── Navigation.jsx
│   │   ├── QuickTrade.jsx
│   │   ├── ContestCard.jsx
│   │   └── TradeHistoryTable.jsx
│   └── app/
│       ├── layout.tsx
│       ├── page.jsx             # Landing page
│       ├── login/
│       ├── register/
│       ├── dashboard/
│       ├── trade/page.tsx       # Live trading interface
│       ├── contests/            # Contest list and leaderboards
│       └── admin/               # Admin panel
│
├── database/
│   ├── init.sql                 # Full schema (tables, enums, triggers)
│   ├── seed.sql                 # Trading pairs, tiers, achievements
│   └── backups/
│
└── scripts/
    ├── deploy.sh                # Production deploy with rollback support
    ├── backup.sh                # DB + Redis + env backup (7-day retention)
    └── status.sh                # System monitoring dashboard
```

---

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login — returns JWT + sets httpOnly refresh cookie |
| POST | `/auth/refresh` | Refresh access token via httpOnly cookie |
| GET | `/auth/me` | Get current authenticated user |

### Trading

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trading/portfolio` | Portfolio with holdings and P&L |
| POST | `/trading/order` | Place market or limit order |
| GET | `/trading/history` | Paginated trade history |

### Market

| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/prices` | Current cached prices for all pairs |
| GET | `/market/klines/{symbol}` | OHLC candlestick data (Binance or Kraken) |
| WS | `/market/ws/prices` | Live price WebSocket stream |

### Contests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/contests/` | List active and upcoming contests |
| POST | `/contests/{id}/join` | Join a contest |
| GET | `/contests/{id}/leaderboard` | Contest rankings |

### Admin *(IP-restricted — see Security)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/{id}/ban` | Ban a user |
| PATCH | `/admin/users/{id}/unban` | Unban a user |
| GET | `/admin/contests` | List all contests |
| POST | `/admin/contests` | Create a contest |

Full interactive docs available at `/docs` (Swagger UI) and `/redoc`.

---

## Configuration

All configuration lives in `.env.production`. See `.env.example` for the full annotated template.

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials |
| `DATABASE_URL` | Async connection string (`postgresql+asyncpg://...`) |
| `REDIS_PASSWORD` / `REDIS_URL` | Redis credentials |
| `JWT_SECRET_KEY` | Token signing key — generate with `openssl rand -hex 64` |
| `FRONTEND_URL` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | Backend API URL (injected into Next.js at build time) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (injected into Next.js at build time) |

**Optional variables:**

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` / `SMTP_PASSWORD` | Email verification (Resend, Gmail, SendGrid, etc.) |
| `KRAKEN_API_KEY` | Kraken private API access |
| `COINGECKO_API_KEY` | CoinGecko price data |
| `OPENROUTER_API_KEY` | AI trading analysis features |
| `STRIPE_RESTRICTED_KEY` | Payment processing for paid tiers |

---

## Security

- Passwords hashed with **Argon2id**
- JWT access tokens (15 min TTL); refresh tokens (7 day TTL) in **httpOnly cookies only**
- Rate limiting on auth (5 register/hr, 10 login/hr) and trading (30 orders/min)
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- CORS restricted to configured `FRONTEND_URL` origin
- `SELECT FOR UPDATE` row-level locking on trades (prevents balance race conditions)
- All database and Redis ports bound to `127.0.0.1` (not exposed externally)
- `/admin/*` routes are **IP-restricted at the Nginx layer** (allow-listed IPs only) in addition to JWT role verification
- Input validation: email ≤ 255 chars, password ≤ 128 chars

---

## Production Deployment

The production compose file (`docker-compose.prod.yml`) adds:

- Resource limits (4 GB/2 CPU Postgres, 2 GB/2 CPU backend, 2 GB/1 CPU Redis, 1 GB/1 CPU frontend)
- `restart: always` on all services
- JSON log rotation (10 MB max, 3 files per container)
- No source-code bind mounts
- Redis password authentication and RDB persistence

### Reverse Proxy (Nginx)

```bash
sudo cp nginx/crypto.conf /etc/nginx/sites-available/trade.yourdomain.com
sudo ln -s /etc/nginx/sites-available/trade.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL

Use Cloudflare (SSL mode "Full (strict)") or certbot:

```bash
sudo certbot --nginx -d trade.yourdomain.com
```

---

## Scripts

### Deploy

```bash
sudo ./scripts/deploy.sh              # Full deploy (pull, build, health check)
sudo ./scripts/deploy.sh --no-pull    # Build from local code only
sudo ./scripts/deploy.sh --no-cache   # Force rebuild all layers
sudo ./scripts/deploy.sh --rollback   # Roll back to previous version
```

### Backup

```bash
sudo ./scripts/backup.sh
```

Backs up PostgreSQL (pg_dump + gzip), Redis (RDB snapshot), and `.env.production`. Deletes backups older than 7 days.

Cron (daily at 3 AM):
```
0 3 * * * cd /opt/Trade-Forge && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Status

```bash
./scripts/status.sh
```

Shows container health, resource usage, DB connections/size, Redis memory, recent errors, disk usage, and endpoint checks.

---

## Troubleshooting

**Backend won't start:**
```bash
docker compose logs backend
docker compose restart backend
```

**Frontend can't reach API:**
```bash
curl http://localhost:8001/health
# Check NEXT_PUBLIC_API_URL in .env.production matches your actual backend URL
```

**Database connection refused:**
```bash
docker compose ps postgres
# Nuclear reset (destroys all data):
docker compose down -v && docker compose up -d
```

**Redis auth error ("NOAUTH"):**
```bash
grep REDIS_PASSWORD .env.production
docker compose restart redis backend
```

**WebSocket prices not updating:**
```bash
curl http://localhost:8001/health
# {"services":{"websocket_feeds":"up"}} should show "up"
docker compose logs backend | grep -E "Binance|Bybit|Kraken"
```

---

## Community

- [Discord](https://discord.gg/dUFzBjJT6N)
- [GitHub Issues](https://github.com/Nfectious/Trade-Forge/issues)

---

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE) for details.
