# TradeForge - Professional Crypto Trading Simulator

**Paper trade like a pro. Win real contests.**

A production-grade crypto trading simulation platform with real-time data, competitions, education, and social features.

---

## 🚀 Quick Start for Developers

### Prerequisites

- **Docker** & **Docker Compose** installed
- **Git** installed
- **4GB RAM minimum**, 8GB recommended
- **Ports 3000 & 8000** available

### Setup in 3 Steps

```bash
# 1. Clone the repository
git clone https://github.com/Nfectious/Trading-Forge.git
cd Trading-Forge

# 2. Generate your .env file
bash generate-env.sh

# 3. Start the platform
docker-compose up -d
```

**Access your platform:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs
- 🏥 Health Check: http://localhost:8000/health

---

## 🔧 Environment Setup

### Automatic Setup (Recommended)

The `generate-env.sh` script automatically:
- ✅ Generates secure random passwords
- ✅ Creates `.env` file with all required variables
- ✅ Uses correct variable names for docker-compose
- ✅ Includes WebSocket URL for live price feeds
- ✅ Adds placeholders for API keys

```bash
bash generate-env.sh
```

### Manual Setup (Advanced)

If you prefer to create `.env` manually:

```bash
# Copy the example template
cp .env.example .env

# Generate secure passwords
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32  # For DB_PASSWORD
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32  # For REDIS_PASSWORD
openssl rand -hex 64                                 # For JWT_SECRET_KEY

# Edit .env and replace CHANGE_ME_* placeholders
nano .env
```

### Required Variables

The `.env` file must include:

| Variable | Purpose | Generated Automatically? |
|----------|---------|-------------------------|
| `DB_USER` | PostgreSQL username | ✅ Yes |
| `DB_PASSWORD` | PostgreSQL password | ✅ Yes (secure random) |
| `REDIS_PASSWORD` | Redis password | ✅ Yes (secure random) |
| `JWT_SECRET_KEY` | JWT token signing | ✅ Yes (64-char hex) |
| `DATABASE_URL` | Backend database connection | ✅ Yes |
| `REDIS_URL` | Backend cache connection | ✅ Yes |
| `SMTP_PASSWORD` | Email API key | ❌ Manual (from Resend) |
| `BACKEND_WS_URL` | WebSocket URL | ✅ Yes (default) |

### Optional API Keys

Update these in `.env` if you want to use these features:

```bash
# Email (Required for user registration)
SMTP_PASSWORD=re_YOUR_RESEND_API_KEY  # Get from https://resend.com/api-keys

# Exchange APIs (Optional - for live price feeds)
KRAKEN_API_KEY=your_key_here          # Get from https://www.kraken.com/u/settings/api
KRAKEN_API_SECRET=your_secret_here
COINGECKO_API_KEY=your_key_here       # Get from https://www.coingecko.com/en/api/pricing

# AI Features (Optional)
OPENROUTER_API_KEY=your_key_here      # Get from https://openrouter.ai/keys

# Payments (Optional)
STRIPE_RESTRICTED_KEY=rk_test_xxx     # Get from https://dashboard.stripe.com/apikeys
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 📋 What's Included (MVP Scaffold)

### ✅ Complete & Working
- **Authentication System**
  - User registration with email verification
  - Secure login (JWT + refresh tokens)
  - Argon2id password hashing
  - Rate limiting (bot protection)
  
- **Database Layer**
  - PostgreSQL 16 with complete schema
  - 40+ tables for full platform features
  - Automated triggers and constraints
  - Seed data (tiers, trading pairs, achievements)
  
- **Infrastructure**
  - Docker Compose orchestration
  - Nginx-ready reverse proxy config
  - Redis for caching and rate limiting
  - Health monitoring endpoints
  - WebSocket support ready

- **Frontend**
  - Next.js 15 with App Router
  - Professional dark theme
  - Responsive mobile-first design
  - Landing page
  - WebSocket client ready

### 🔨 Ready for Enhancement (Placeholders)
- Login/Register UI forms
- Trading engine logic
- User dashboard
- Wallet transactions
- Contest system
- Leaderboards
- Education modules
- Admin panel
- Real-time price feeds (WebSocket infrastructure ready)

---

## 📂 Project Structure

```
Trading-Forge/
├── generate-env.sh        # Auto-generate .env file
├── .env.example           # Complete template (all variables)
├── .env                   # Your secrets (NOT in Git)
├── docker-compose.yml     # Service orchestration
│
├── database/
│   ├── init.sql           # Complete schema (40+ tables)
│   ├── seed.sql           # Initial data
│   └── backups/           # Backup directory
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── gunicorn.conf.py
│   └── app/
│       ├── main.py        # FastAPI entry point
│       ├── core/
│       │   ├── config.py  # Environment variables (includes WebSocket & API keys)
│       │   ├── security.py
│       │   └── database.py
│       ├── models/        # SQLModel data models
│       └── api/           # API routes
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── app/               # Next.js App Router
│       ├── layout.tsx
│       ├── page.tsx       # Landing page
│       ├── login/
│       └── register/
│
└── nginx/
    └── crypto.conf        # Reverse proxy config
```

---

## 🔒 Security Notes

### What's Protected
- ✅ `.env` file in `.gitignore` (never committed)
- ✅ Passwords hashed with Argon2id (NIST-approved)
- ✅ JWT tokens with 15min expiration
- ✅ Refresh token rotation
- ✅ Rate limiting on auth endpoints
- ✅ SQL injection protection (SQLModel/SQLAlchemy)
- ✅ CORS configured
- ✅ Redis password-protected
- ✅ PostgreSQL localhost-only access

### Important Security Reminders
⚠️ Never commit `.env` to Git (already in `.gitignore`)  
⚠️ Each developer needs their own `.env` file  
⚠️ Store production `.env` securely (password manager)  
⚠️ Use HTTPS only in production (Cloudflare)  
⚠️ Rotate secrets regularly  

---

## 🛠️ Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Access database
docker-compose exec postgres psql -U crypto_admin -d crypto_platform

# Access backend shell
docker-compose exec backend /bin/bash

# Check service status
docker-compose ps

# Check health
curl http://localhost:8000/health
```

---

## 📊 Database Management

### Backup Database

```bash
docker-compose exec postgres pg_dump -U crypto_admin crypto_platform > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
cat backup_20241109.sql | docker-compose exec -T postgres psql -U crypto_admin -d crypto_platform
```

---

## 🧪 Testing the Platform

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","nickname":"testuser"}'

# Check WebSocket support (once implemented)
wscat -c ws://localhost:8000/market/ws/prices
```

### 2. Test Frontend

1. Open http://localhost:3000
2. Click "Get Started Free"
3. See placeholder registration page

---

## 🚀 Production Deployment

### 1. Update Environment Variables

Edit `.env` for production:

```bash
# Change these for production
ENVIRONMENT=production
DEBUG=false

FRONTEND_URL=https://crypto.yourdomain.com
BACKEND_URL=https://crypto.yourdomain.com/api
BACKEND_WS_URL=wss://crypto.yourdomain.com/market/ws/prices
```

### 2. Nginx Reverse Proxy

```bash
sudo cp nginx/crypto.conf /etc/nginx/sites-available/crypto.yourdomain.com
sudo ln -s /etc/nginx/sites-available/crypto.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Cloudflare Setup

1. Point DNS to your VPS IP
2. Set SSL/TLS mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "Auto Minify" (JS, CSS, HTML)

---

## 📚 API Documentation

Once deployed, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Available endpoints:
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/verify` - Verify email
- `GET /auth/me` - Get current user
- `GET /wallet/balance` - Get balance
- `GET /trading/portfolio` - Get portfolio

---

## 🎯 Next Development Steps

### Phase 1: WebSocket Integration (Current)
1. ✅ Environment variables configured
2. ✅ config.py updated with API keys
3. ⏳ Create `websocket_manager.py` (connects to exchanges)
4. ⏳ Create `market.py` API endpoints
5. ⏳ Build frontend WebSocket hook
6. ⏳ Display live prices on trading page

### Phase 2: Complete Auth UI
1. Build login form component
2. Build registration form component
3. Add form validation (Zod)
4. Connect to backend API

### Phase 3: Trading Engine
1. Implement buy/sell order logic
2. Use live prices from WebSocket
3. Calculate portfolio value
4. Trade history display

### Phase 4: User Dashboard
1. Portfolio overview
2. Performance charts
3. Recent trades table
4. Balance display

### Phase 5: Contest System
1. Create contest management
2. Participant enrollment
3. Live rankings
4. Prize distribution

---

## 🐛 Troubleshooting

### Environment variable errors

```bash
# Symptom: "DB_USER not set" or similar
# Solution: Regenerate .env file
bash generate-env.sh
docker-compose down
docker-compose up -d
```

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issue: Database not ready
# Solution: Wait 30 seconds and retry
docker-compose restart backend
```

### Frontend shows connection error

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check environment variable
docker-compose exec frontend env | grep NEXT_PUBLIC_API_URL
```

### Database connection refused

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Redis authentication failed

```bash
# Symptom: "NOAUTH Authentication required"
# Solution: Make sure REDIS_PASSWORD is set in .env
grep REDIS_PASSWORD .env

# Regenerate if missing
bash generate-env.sh
docker-compose restart redis backend
```

---

## 👥 For Collaborators

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nfectious/Trading-Forge.git
   cd Trading-Forge
   ```

2. **Generate your own .env**
   ```bash
   bash generate-env.sh
   ```
   This creates a `.env` file with secure passwords unique to you.

3. **Update optional API keys**
   ```bash
   nano .env
   # Add your SMTP_PASSWORD, Stripe keys, etc.
   ```

4. **Start developing**
   ```bash
   docker-compose up -d
   ```

### Important for Collaborators
- ❌ Never commit `.env` to Git
- ✅ Each person generates their own `.env` using `generate-env.sh`
- ✅ Share API keys securely (not in Slack/Discord)
- ✅ Use the same `.env.example` template for consistency

---

## 📞 Support & Resources

- **Documentation**: See `/docs` folder
- **GitHub**: https://github.com/Nfectious/Trading-Forge
- **Discord**: Join the community! 👇

## 💬 Join the Community

[**TradeForge Discord**](https://discord.gg/dUFzBjJT6N)

Connect with other traders, get support, share strategies, and stay updated on platform features!

---

## 📝 License

Proprietary - All Rights Reserved

---

## 🎉 You're Ready!

Your crypto simulation platform scaffold is deployed and running. The foundation is solid, secure, and ready for feature development.

**What you have:**
- ✅ Production-grade architecture
- ✅ Complete database schema
- ✅ Authentication system
- ✅ Docker infrastructure
- ✅ Professional UI foundation
- ✅ WebSocket infrastructure ready
- ✅ Exchange API integration ready

**Next:** Start building features module by module.

**Need help?** Ask for the next module implementation:
- "Implement WebSocket price feeds"
- "Build the login/register forms"
- "Implement the trading engine"
- "Create the user dashboard"
- "Build the contest system"