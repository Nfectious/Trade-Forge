# TradeForge - Professional Crypto Trading Simulator

**Paper trade like a pro. Win real contests.**

A production-grade crypto trading simulation platform with real-time data, competitions, education, and social features.

## 🚀 Quick Start (5 Minutes to Deployment)

### Prerequisites

- **Docker** & **Docker Compose** installed
- **Ubuntu 24.04 LTS** (recommended)
- **4GB RAM minimum**, 8GB recommended
- **Port 3000** (frontend) and **8000** (backend) available

### One-Command Deployment

```bash
sudo ./deploy.sh
```

That's it! The script will:
1. Generate secure secrets automatically
2. Build Docker containers
3. Initialize database with schema + seed data
4. Start all services (PostgreSQL, Redis, FastAPI, Next.js)
5. Run health checks

**Access your platform:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

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

- **Frontend**
  - Next.js 15 with App Router
  - Professional dark theme
  - Responsive mobile-first design
  - Landing page

### 🔨 Ready for Enhancement (Placeholders)
- Login/Register UI forms
- Trading engine logic
- User dashboard
- Wallet transactions
- Contest system
- Leaderboards
- Education modules
- Admin panel

---

## 📁 Project Structure

```
crypto-platform/
├── deploy.sh              # ONE-COMMAND DEPLOYMENT
├── docker-compose.yml     # Service orchestration
├── .env.production        # Generated secrets
├
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
│       ├── core/          # Config, security, database
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

## 🔧 Post-Deployment Configuration

### 1. Email Settings (Required for Registration)

Edit `.env.production`:

```bash
# For Gmail (most common)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Generate at: https://myaccount.google.com/apppasswords
SMTP_FROM=noreply@yourdomain.com
```

After editing, restart services:
```bash
docker-compose restart backend
```

### 2. Production URLs

Update `.env.production` for production deployment:

```bash
FRONTEND_URL=https://crypto.yourdomain.com
BACKEND_URL=https://crypto.yourdomain.com/api
```

### 3. Nginx Reverse Proxy (Production)

Copy Nginx config to your system:

```bash
sudo cp nginx/crypto.conf /etc/nginx/sites-available/crypto.yourdomain.com
sudo ln -s /etc/nginx/sites-available/crypto.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Cloudflare Setup

1. Point DNS to your VPS IP
2. Set SSL/TLS mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "Auto Minify" (JS, CSS, HTML)

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
```

### 2. Test Frontend

1. Open http://localhost:3000
2. Click "Get Started Free"
3. See placeholder registration page

---

## 🔐 Security Checklist

- ✅ Passwords hashed with Argon2id (NIST-approved)
- ✅ JWT tokens with 15min expiration
- ✅ Refresh token rotation
- ✅ Rate limiting on auth endpoints
- ✅ SQL injection protection (SQLModel/SQLAlchemy)
- ✅ CORS configured
- ✅ Secrets in .env (not in code)
- ⚠️ Change default secrets before production
- ⚠️ Enable HTTPS only (Cloudflare)
- ⚠️ Restrict database port (only localhost)

---

## 🎯 Next Development Steps

### Week 1: Complete Auth UI
1. Build login form component
2. Build registration form component
3. Add form validation (Zod)
4. Connect to backend API

### Week 2: Trading Engine
1. Implement buy/sell order logic
2. Connect Kraken WebSocket for real-time prices
3. Calculate portfolio value
4. Trade history display

### Week 3: User Dashboard
1. Portfolio overview
2. Performance charts
3. Recent trades table
4. Balance display

### Week 4: Contest System
1. Create contest management
2. Participant enrollment
3. Live rankings
4. Prize distribution

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

## 🐛 Troubleshooting

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

---

## 📞 Support & Resources

- **Documentation**: See `/docs` folder (to be created)
- **GitHub**: https://github.com/Nfectious/crypto-sim-trading
- **Discord**: Join the community below! 👇

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

**Next:** Start building features module by module. Each week, we'll enhance one major feature until you have a complete, production-ready platform.

**Need help?** Ask for the next module implementation:
- "Build the login/register forms"
- "Implement the trading engine"
- "Create the user dashboard"
- "Build the contest system"
