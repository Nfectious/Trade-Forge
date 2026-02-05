#!/bin/bash
###############################################################################
# CRYPTO PLATFORM - ONE-COMMAND DEPLOYMENT
# Usage: sudo ./deploy.sh
###############################################################################
set -e
echo "🚀 Crypto Platform Deployment Starting..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not installed${NC}"; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not installed${NC}"; exit 1; }
echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Generate secrets if .env.production doesn't exist
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}🔐 Generating secrets...${NC}"
   
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -hex 64)
   
    cat > .env.production << EOF
# Database
DB_USER=crypto_admin
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql+asyncpg://crypto_admin:${DB_PASSWORD}@postgres:5432/crypto_platform
# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
# JWT
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
# URLs (UPDATE THESE FOR PRODUCTION)
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:8000
# Email (UPDATE THESE)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@bsapservices.com
# Environment
ENVIRONMENT=production
DEBUG=false
# Rate Limiting
RATE_LIMIT_SIGNUP=5/hour
RATE_LIMIT_LOGIN=10/hour
# Tier Balances (in cents)
TIER_FREE_BALANCE=1000000
TIER_PRO_BALANCE=2500000
TIER_ELITE_BALANCE=10000000
TIER_VALKYRIE_BALANCE=50000000
EOF
    echo -e "${GREEN}✅ Secrets generated in .env.production${NC}"
    echo -e "${YELLOW}⚠️ IMPORTANT: Edit .env.production and update:${NC}"
    echo -e " - SMTP settings (email configuration)"
    echo -e " - FRONTEND_URL and BACKEND_URL for production"
    echo ""
    read -p "Press enter to continue with deployment..."
fi

# Load environment
set -a
source .env.production
set +a

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p database/backups
mkdir -p logs

# Build containers (with no-cache for clean build)
echo -e "${YELLOW}🔨 Building Docker containers (this may take a few minutes)...${NC}"
docker compose build --no-cache

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker compose up -d

# Wait for database
echo -e "${YELLOW}⏳ Waiting for database to initialize (45 seconds)...${NC}"
sleep 45

# Check service health
echo -e "${YELLOW}🏥 Running health checks...${NC}"
sleep 5

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local max_attempts=15
    local attempt=1
   
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for $service (attempt $attempt/$max_attempts)...${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
   
    echo -e "${RED}❌ $service failed to start${NC}"
    docker compose logs $service
    return 1
}

# Check backend
check_service "Backend API" "http://localhost:8000/health"

# Check frontend
check_service "Frontend" "http://localhost:3001"

# Show final status
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "🌐 ${BLUE}Frontend:${NC} ${GREEN}http://localhost:3001${NC}"
echo -e "🔌 ${BLUE}Backend API:${NC} ${GREEN}http://localhost:8000${NC}"
echo -e "📚 ${BLUE}API Docs:${NC} ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "📊 ${BLUE}Service Status:${NC}"
docker compose ps
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. ✅ Services are running"
echo "2. 📧 Update email settings in .env.production"
echo "3. 🌍 Update URLs for production deployment"
echo "4. 🔒 Configure Nginx reverse proxy (see nginx/crypto.conf)"
echo "5. 🔐 Set up Cloudflare DNS and SSL"
echo "6. 🧪 Test registration: http://localhost:3001/register"
echo ""
echo -e "${BLUE}📖 Useful Commands:${NC}"
echo -e " View logs: ${GREEN}docker compose logs -f${NC}"
echo -e " View specific: ${GREEN}docker compose logs -f backend${NC}"
echo -e " Stop services: ${GREEN}docker compose down${NC}"
echo -e " Restart: ${GREEN}docker compose restart${NC}"
echo -e " Rebuild: ${GREEN}docker compose up -d --build${NC}"
echo ""
echo -e "${GREEN}🎉 Your crypto platform is now running!${NC}"
echo ""
