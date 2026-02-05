#!/bin/bash
# =============================================================================
# GENERATE SECURE .env FILE
# Run this to create a .env file with auto-generated secure passwords
# =============================================================================

set -e

echo "🔐 Generating secure .env file..."

# Generate secure values
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -hex 64)

# Create .env file
cat > .env << EOF
# =============================================================================
# CRYPTO SIMULATION PLATFORM - ENVIRONMENT CONFIGURATION
# Auto-generated on $(date)
# =============================================================================

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DB_USER=crypto_admin
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql+asyncpg://crypto_admin:${DB_PASSWORD}@postgres:5432/crypto_platform
POSTGRES_USER=crypto_admin
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=crypto_platform

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# =============================================================================
# JWT & SECURITY
# =============================================================================
JWT_SECRET_KEY=${JWT_SECRET}
JWT_SECRET=${JWT_SECRET}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# =============================================================================
# EMAIL CONFIGURATION (UPDATE THESE)
# =============================================================================
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_XXXXXXXXXXXXXXXXXXXXXXXX
SMTP_FROM=noreply@resend.dev

# =============================================================================
# APPLICATION URLS
# =============================================================================
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:8000
BACKEND_WS_URL=ws://localhost:8000/market/ws/prices

# Production URLs (uncomment when deploying)
# FRONTEND_URL=https://crypto.bsapservices.com
# BACKEND_URL=https://crypto.bsapservices.com/api
# BACKEND_WS_URL=wss://crypto.bsapservices.com/market/ws/prices

# =============================================================================
# ENVIRONMENT SETTINGS
# =============================================================================
ENVIRONMENT=development
DEBUG=true

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_SIGNUP=5/hour
RATE_LIMIT_LOGIN=10/hour

# =============================================================================
# EXCHANGE API KEYS (Optional)
# =============================================================================
KRAKEN_API_KEY=
KRAKEN_API_SECRET=
COINGECKO_API_KEY=
OPENROUTER_API_KEY=

# =============================================================================
# STRIPE PAYMENTS (Optional)
# =============================================================================
STRIPE_RESTRICTED_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_ELITE=
STRIPE_PRICE_ID_VALKYRIE=

# =============================================================================
# TIER BALANCES (in cents)
# =============================================================================
TIER_FREE_BALANCE=1000000
TIER_PRO_BALANCE=2500000
TIER_ELITE_BALANCE=10000000
TIER_VALKYRIE_BALANCE=50000000
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📝 Auto-generated secure values:"
echo "   DB_PASSWORD:     ${DB_PASSWORD}"
echo "   REDIS_PASSWORD:  ${REDIS_PASSWORD}"
echo "   JWT_SECRET_KEY:  ${JWT_SECRET:0:20}... (truncated)"
echo ""
echo "⚠️  IMPORTANT: Update these manually in .env:"
echo "   - SMTP_PASSWORD (get from https://resend.com/api-keys)"
echo "   - STRIPE_* values (if using payments)"
echo "   - Exchange API keys (if using live data)"
echo ""
echo "💾 Backup this file - store passwords securely!"
