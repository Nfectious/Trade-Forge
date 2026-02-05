# TradeForge

Paper trade crypto with real-time prices. Compete in contests. Track your performance.

TradeForge is a full-stack crypto paper trading platform with live WebSocket price feeds, portfolio management, and a contest system. Built for learning crypto trading without risking real money.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI 0.115, Python 3.12, Gunicorn + Uvicorn |
| Database | PostgreSQL 16 (40+ tables, UUID PKs, DB triggers) |
| Cache | Redis 7 (price cache, rate limiting, sessions) |
| Auth | JWT access tokens + httpOnly refresh cookies, Argon2id |
| Prices | WebSocket feeds from Binance, Bybit, Kraken |
| Infra | Docker Compose, multi-stage builds |

## Prerequisites

- Docker and Docker Compose v2
- Git
- 8GB RAM recommended (4GB minimum)
- Ports 3001 and 8000 available

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/Nfectious/Trade-Forge.git
cd Trade-Forge
cp .env.example .env.production
```

### 2. Generate secrets

Fill in the required values in `.env.production`:

```bash
# Generate secure values for these fields:
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32   # DB_PASSWORD
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32   # REDIS_PASSWORD
openssl rand -hex 64                                   # JWT_SECRET_KEY
```

Then update `DATABASE_URL` and `REDIS_URL` with the passwords you generated:

```
DATABASE_URL=postgresql+asyncpg://crypto_admin:YOUR_DB_PASSWORD@postgres:5432/crypto_platform
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis:6379/0
```

### 3. Start services

**Development:**
```bash
docker compose up -d
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

Or use the deployment script (runs pre-flight checks, backups, and health verification):
```bash
sudo ./scripts/deploy.sh
```

### 4. Verify

```bash
curl http://localhost:8000/health
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Health Dashboard | http://localhost:3001/health |

## Project Structure

```
Trade-Forge/
├── docker-compose.yml          # Development services
├── docker-compose.prod.yml     # Production (resource limits, log rotation)
├── .env.example                # Environment template
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── gunicorn.conf.py
│   └── app/
│       ├── main.py             # FastAPI app, middleware, startup/shutdown
│       ├── core/
│       │   ├── config.py       # Pydantic settings
│       │   ├── security.py     # JWT, password hashing, security headers
│       │   ├── database.py     # Async SQLModel session
│       │   ├── redis.py        # Shared Redis client
│       │   └── websocket_manager.py  # Exchange WS connections
│       ├── models/
│       │   ├── user.py         # User, UserLogin, UserCreate
│       │   ├── trade.py        # TradingPair, Order, Trade
│       │   ├── portfolio.py    # Portfolio, PortfolioHolding
│       │   ├── wallet.py       # VirtualWallet, WalletTransaction
│       │   └── contest.py      # Contest, ContestResponse
│       ├── api/
│       │   ├── auth.py         # /auth/* (register, login, refresh, me)
│       │   ├── trading.py      # /trading/* (portfolio, orders, history)
│       │   ├── market.py       # /market/* (prices, WebSocket endpoint)
│       │   ├── wallet.py       # /wallet/* (balance)
│       │   ├── users.py        # /users/*
│       │   └── admin.py        # /admin/*
│       └── services/
│           ├── trade_executor.py       # Order creation, balance validation
│           └── portfolio_calculator.py # Real-time portfolio valuation
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── lib/
│   │   ├── api.ts              # Axios client with interceptors + token refresh
│   │   └── auth.tsx            # Auth context (login, logout, session)
│   ├── hooks/
│   │   ├── usePriceStream.ts   # WebSocket live price hook
│   │   └── usePortfolio.ts     # Portfolio data hook
│   └── app/
│       ├── layout.jsx
│       ├── page.jsx            # Landing page
│       ├── login/page.jsx
│       ├── register/
│       ├── dashboard/
│       ├── trade/page.tsx      # Trading interface
│       ├── admin/
│       └── health/page.jsx     # System health dashboard
│
├── database/
│   ├── init.sql                # Full schema (40+ tables, enums, triggers)
│   ├── seed.sql                # Trading pairs, tiers, achievements
│   └── backups/
│
├── scripts/
│   ├── deploy.sh               # Production deployment with rollback
│   ├── backup.sh               # DB + Redis + env backup (7-day retention)
│   └── status.sh               # System monitoring dashboard
│
└── nginx/
    └── crypto.conf             # Reverse proxy config
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login (returns JWT + sets refresh cookie) |
| POST | `/auth/refresh` | Refresh access token (reads httpOnly cookie) |
| GET | `/auth/me` | Get current user |

### Trading
| Method | Path | Description |
|--------|------|-------------|
| GET | `/trading/portfolio` | Get portfolio with holdings |
| POST | `/trading/order` | Place market order |
| GET | `/trading/history` | Trade history |

### Market
| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/prices` | Current cached prices |
| WS | `/market/ws/prices` | Live price WebSocket stream |

### Wallet
| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet/balance` | Get wallet balance |

## Configuration

All configuration is in `.env.production`. See `.env.example` for the full template with comments.

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials |
| `DATABASE_URL` | Async connection string |
| `REDIS_PASSWORD` / `REDIS_URL` | Redis credentials |
| `JWT_SECRET_KEY` | Token signing key (64+ hex chars) |
| `FRONTEND_URL` | CORS origin |

**Optional variables:**

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` / `SMTP_PASSWORD` | Email verification (Resend, Gmail, etc.) |
| `KRAKEN_API_KEY` | Kraken exchange API |
| `COINGECKO_API_KEY` | CoinGecko price data |
| `OPENROUTER_API_KEY` | AI trading features |
| `STRIPE_RESTRICTED_KEY` | Payment processing for paid tiers |

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

Cron example (daily at 3 AM):
```
0 3 * * * cd /opt/Trade-Forge && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Status
```bash
./scripts/status.sh
```

Shows container health, resource usage, DB connections/size, Redis memory, recent errors, disk space, and endpoint checks.

## Production Deployment

The production compose file (`docker-compose.prod.yml`) adds:

- Resource limits (4G/2cpu Postgres, 2G/2cpu backend, 2G/1cpu Redis, 1G/1cpu frontend)
- `restart: always` on all services
- JSON log rotation (10MB, 3 files per container)
- No source code bind mounts
- Redis password authentication and RDB persistence

### Reverse Proxy (Nginx)

```bash
sudo cp nginx/crypto.conf /etc/nginx/sites-available/crypto.yourdomain.com
sudo ln -s /etc/nginx/sites-available/crypto.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL

Use Cloudflare (set SSL mode to "Full (strict)") or certbot:
```bash
sudo certbot --nginx -d crypto.yourdomain.com
```

## Security

- Passwords hashed with Argon2id
- JWT access tokens (15 min TTL) in localStorage
- Refresh tokens (7 day TTL) in httpOnly cookies only
- Rate limiting on auth (5 register/hr, 10 login/hr) and trading (30 orders/min)
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- CORS restricted to configured frontend origin
- `SELECT FOR UPDATE` row-level locking on trades (prevents balance race conditions)
- All DB ports bound to 127.0.0.1 (localhost only)
- Input validation: email max 255 chars, password max 128 chars

## Troubleshooting

**Backend won't start:**
```bash
docker compose logs backend          # Check error output
docker compose restart backend       # Retry after DB is ready
```

**Frontend connection error:**
```bash
curl http://localhost:8000/health     # Verify backend is running
```

**Database connection refused:**
```bash
docker compose ps postgres            # Check container status
docker compose down -v && docker compose up -d   # Nuclear reset (destroys data)
```

**Redis auth error ("NOAUTH"):**
```bash
grep REDIS_PASSWORD .env.production   # Verify password is set
docker compose restart redis backend
```

## Community

- [TradeForge Discord](https://discord.gg/dUFzBjJT6N)
- [GitHub Issues](https://github.com/Nfectious/Trade-Forge/issues)

## License

Proprietary - All Rights Reserved
