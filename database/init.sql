-- =============================================================================
-- CRYPTO SIMULATION PLATFORM - DATABASE SCHEMA
-- PostgreSQL 16+ Required
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'pending_verification');
CREATE TYPE tier_level AS ENUM ('free', 'pro', 'elite', 'valkyrie');
CREATE TYPE trader_type AS ENUM ('scalper', 'day_trader', 'swing_trader', 'position_trader', 'hodler', 'algorithmic');
CREATE TYPE transaction_type AS ENUM ('initial_deposit', 'tier_bonus', 'contest_prize', 'trade_profit', 'trade_loss', 'admin_adjustment', 'reset', 'education_reward');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit');
CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_status AS ENUM ('pending', 'filled', 'cancelled', 'rejected');
CREATE TYPE contest_type AS ENUM ('free', 'paid');
CREATE TYPE contest_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE prize_type AS ENUM ('sim_currency', 'cash', 'achievement', 'tier_upgrade', 'custom');
CREATE TYPE leaderboard_timeframe AS ENUM ('daily', 'weekly', 'monthly', 'all_time');
CREATE TYPE achievement_category AS ENUM ('trading', 'contest', 'social', 'milestone', 'special');
CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary', 'valkyrie');
CREATE TYPE admin_action AS ENUM ('grant_currency', 'deduct_currency', 'change_tier', 'grant_achievement', 'suspend_user', 'unsuspend_user', 'ban_user', 'delete_user', 'feature_toggle', 'contest_adjustment');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending_verification',
    tier tier_level DEFAULT 'free',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    
    suspended_until TIMESTAMPTZ,
    suspension_reason TEXT,
    
    discord_id VARCHAR(100),
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON email_verification_tokens(token);

-- Refresh tokens (for JWT auth)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- User profiles
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    nickname VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    
    trader_type trader_type,
    trading_goal TEXT,
    experience_level VARCHAR(50),
    
    twitter_handle VARCHAR(50),
    discord_username VARCHAR(50),
    telegram_handle VARCHAR(50),
    
    profile_public BOOLEAN DEFAULT true,
    show_stats BOOLEAN DEFAULT true,
    show_leaderboard BOOLEAN DEFAULT true,
    
    xp_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT nickname_format CHECK (nickname ~* '^[a-zA-Z0-9_-]{3,50}$')
);

CREATE INDEX idx_profiles_nickname ON user_profiles(nickname);
CREATE INDEX idx_profiles_xp ON user_profiles(xp_points DESC);

-- Tier definitions
CREATE TABLE tier_definitions (
    tier tier_level PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    
    starting_balance BIGINT DEFAULT 1000000,
    monthly_bonus BIGINT DEFAULT 0,
    
    max_concurrent_trades INTEGER DEFAULT 10,
    max_portfolio_value BIGINT,
    advanced_charts BOOLEAN DEFAULT false,
    strategy_builder_access BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    
    free_contest_entries_per_month INTEGER DEFAULT 5,
    paid_contest_discount_percent INTEGER DEFAULT 0,
    
    private_chat_rooms BOOLEAN DEFAULT false,
    mentor_access BOOLEAN DEFAULT false,
    
    advanced_analytics BOOLEAN DEFAULT false,
    historical_data_years INTEGER DEFAULT 1,
    
    priority_support BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Virtual wallets
CREATE TABLE virtual_wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance BIGINT DEFAULT 0,
    total_earned BIGINT DEFAULT 0,
    total_spent BIGINT DEFAULT 0,
    all_time_high BIGINT DEFAULT 0,
    all_time_low BIGINT,
    last_reset TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_wallets_balance ON virtual_wallets(balance DESC);

-- Wallet transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    
    description TEXT,
    reference_id UUID,
    admin_id UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT amount_not_zero CHECK (amount != 0)
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);

-- =============================================================================
-- TRADING TABLES
-- =============================================================================

-- Trading pairs (supported cryptocurrencies)
CREATE TABLE trading_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    min_order_size DECIMAL(20,8),
    max_order_size DECIMAL(20,8),
    price_decimals INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trading_pairs_symbol ON trading_pairs(symbol);
CREATE INDEX idx_trading_pairs_active ON trading_pairs(is_active);

-- User portfolios
CREATE TABLE portfolios (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_value BIGINT DEFAULT 0,
    cash_balance BIGINT DEFAULT 0,
    invested_value BIGINT DEFAULT 0,
    unrealized_pnl BIGINT DEFAULT 0,
    realized_pnl BIGINT DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolios_value ON portfolios(total_value DESC);

-- Portfolio holdings
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    
    quantity DECIMAL(20,8) NOT NULL,
    avg_entry_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    total_value BIGINT,
    unrealized_pnl BIGINT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_holding UNIQUE(user_id, trading_pair_id),
    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_holdings_user ON portfolio_holdings(user_id);

-- Orders (trades)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    
    order_type order_type NOT NULL,
    side order_side NOT NULL,
    status order_status DEFAULT 'pending',
    
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8),
    filled_quantity DECIMAL(20,8) DEFAULT 0,
    filled_avg_price DECIMAL(20,8),
    
    total_cost BIGINT,
    fee BIGINT DEFAULT 0,
    
    stop_price DECIMAL(20,8),
    take_profit_price DECIMAL(20,8),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pair ON orders(trading_pair_id);

-- Trade history (executed trades)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    
    side order_side NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    total_value BIGINT NOT NULL,
    fee BIGINT DEFAULT 0,
    
    pnl BIGINT,
    pnl_percent DECIMAL(10,4),
    
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_user ON trades(user_id, executed_at DESC);
CREATE INDEX idx_trades_pair ON trades(trading_pair_id);

-- =============================================================================
-- CONTEST TABLES
-- =============================================================================

CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type contest_type NOT NULL,
    status contest_status DEFAULT 'upcoming',
    
    entry_fee DECIMAL(10,2) DEFAULT 0,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    starting_balance BIGINT DEFAULT 10000000,
    allowed_assets TEXT[],
    max_trades_per_day INTEGER,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_timeframe CHECK (end_time > start_time),
    CONSTRAINT paid_has_fee CHECK (type = 'free' OR entry_fee > 0)
);

CREATE INDEX idx_contests_status ON contests(status, start_time);
CREATE INDEX idx_contests_type ON contests(type);

CREATE TABLE contest_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    
    rank_position INTEGER NOT NULL,
    prize_type prize_type NOT NULL,
    
    sim_currency_amount BIGINT,
    cash_amount DECIMAL(10,2),
    achievement_id UUID,
    tier_upgrade tier_level,
    custom_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_rank_per_contest UNIQUE(contest_id, rank_position)
);

CREATE TABLE contest_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    starting_balance BIGINT NOT NULL,
    current_balance BIGINT,
    final_balance BIGINT,
    final_rank INTEGER,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    
    disqualified BOOLEAN DEFAULT false,
    disqualification_reason TEXT,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_participant_per_contest UNIQUE(contest_id, user_id)
);

CREATE INDEX idx_contest_participants_user ON contest_participants(user_id);
CREATE INDEX idx_contest_participants_contest ON contest_participants(contest_id, final_rank);

-- =============================================================================
-- LEADERBOARD & ACHIEVEMENTS
-- =============================================================================

CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    timeframe leaderboard_timeframe NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    rank INTEGER,
    portfolio_value BIGINT,
    profit_loss BIGINT,
    profit_loss_percent DECIMAL(10,4),
    total_trades INTEGER,
    win_rate DECIMAL(5,2),
    sharpe_ratio DECIMAL(10,4),
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_period UNIQUE(user_id, timeframe, period_start)
);

CREATE INDEX idx_leaderboard_timeframe_rank ON leaderboard_entries(timeframe, period_start, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id, timeframe);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category achievement_category NOT NULL,
    rarity achievement_rarity DEFAULT 'common',
    
    icon_url TEXT,
    badge_color VARCHAR(7),
    
    criteria JSONB,
    
    sim_currency_reward BIGINT DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    tier_bonus_days INTEGER DEFAULT 0,
    
    is_secret BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_code ON achievements(code);
CREATE INDEX idx_achievements_category ON achievements(category);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 100,
    
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER,
    
    CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, earned_at DESC);

-- =============================================================================
-- SOCIAL FEATURES
-- =============================================================================

CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT unique_follow UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Trading strategies
CREATE TABLE trading_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    
    parameters JSONB,
    
    win_rate DECIMAL(5,2),
    avg_profit_per_trade BIGINT,
    total_trades_executed INTEGER DEFAULT 0,
    
    is_public BOOLEAN DEFAULT false,
    times_copied INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strategies_user ON trading_strategies(user_id, is_primary);
CREATE INDEX idx_strategies_public ON trading_strategies(is_public, times_copied DESC);

-- =============================================================================
-- EDUCATION SYSTEM
-- =============================================================================

CREATE TABLE education_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20),
    order_index INTEGER,
    xp_reward INTEGER DEFAULT 100,
    sim_currency_reward BIGINT DEFAULT 5000,
    estimated_time_minutes INTEGER,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE education_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES education_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE education_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES education_lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_education_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES education_modules(id) ON DELETE CASCADE,
    
    completed_lessons UUID[],
    quiz_score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT unique_user_module UNIQUE(user_id, module_id)
);

-- =============================================================================
-- ADMIN & ANALYTICS
-- =============================================================================

CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action admin_action NOT NULL,
    details JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_user_id, created_at DESC);

CREATE TABLE signup_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country_code CHAR(2),
    device_type VARCHAR(50),
    
    signup_completed BOOLEAN DEFAULT FALSE,
    verification_completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signup_analytics_country ON signup_analytics(country_code, created_at);
CREATE INDEX idx_signup_analytics_device ON signup_analytics(device_type);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON virtual_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update wallet balance after transaction
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE virtual_wallets
    SET 
        balance = NEW.balance_after,
        total_earned = total_earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
        total_spent = total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        all_time_high = GREATEST(all_time_high, NEW.balance_after),
        all_time_low = CASE 
            WHEN all_time_low IS NULL THEN NEW.balance_after
            ELSE LEAST(all_time_low, NEW.balance_after)
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Auto-create profile and wallet on user registration
CREATE OR REPLACE FUNCTION create_user_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    
    -- Create wallet with tier-based starting balance
    INSERT INTO virtual_wallets (user_id, balance, all_time_high)
    SELECT NEW.id, td.starting_balance, td.starting_balance
    FROM tier_definitions td
    WHERE td.tier = NEW.tier;
    
    -- Create portfolio
    INSERT INTO portfolios (user_id, total_value, cash_balance)
    SELECT NEW.id, td.starting_balance, td.starting_balance
    FROM tier_definitions td
    WHERE td.tier = NEW.tier;
    
    -- Log initial deposit
    INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
    SELECT NEW.id, 'initial_deposit', td.starting_balance, td.starting_balance, 'Account creation bonus'
    FROM tier_definitions td
    WHERE td.tier = NEW.tier;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_dependencies
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_dependencies();

-- Prevent contest join after start
CREATE OR REPLACE FUNCTION check_contest_join()
RETURNS TRIGGER AS $$
DECLARE
    contest_start TIMESTAMPTZ;
BEGIN
    SELECT start_time INTO contest_start
    FROM contests
    WHERE id = NEW.contest_id;
    
    IF contest_start < NOW() THEN
        RAISE EXCEPTION 'Cannot join contest after start time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_contest_join
BEFORE INSERT ON contest_participants
FOR EACH ROW
EXECUTE FUNCTION check_contest_join();

-- =============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- User follower counts
CREATE MATERIALIZED VIEW user_follower_counts AS
SELECT 
    u.id AS user_id,
    COALESCE(followers.count, 0) AS follower_count,
    COALESCE(following.count, 0) AS following_count
FROM users u
LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM user_follows
    GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM user_follows
    GROUP BY follower_id
) following ON u.id = following.follower_id;

CREATE UNIQUE INDEX ON user_follower_counts (user_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_follower_counts()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_follower_counts;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL INDEXES FOR PERFORMANCE
-- =============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at DESC);
CREATE INDEX idx_trades_user_date ON trades(user_id, executed_at DESC);
CREATE INDEX idx_wallet_txns_user_type ON wallet_transactions(user_id, type, created_at DESC);

-- =============================================================================
-- COMMENTS (DOCUMENTATION)
-- =============================================================================

COMMENT ON TABLE users IS 'Core user authentication and account data';
COMMENT ON TABLE user_profiles IS 'Extended user profile information and social data';
COMMENT ON TABLE virtual_wallets IS 'Simulated trading account balances';
COMMENT ON TABLE orders IS 'All trading orders (pending, filled, cancelled)';
COMMENT ON TABLE trades IS 'Executed trade history';
COMMENT ON TABLE contests IS 'Trading competitions';
COMMENT ON TABLE achievements IS 'Gamification rewards and badges';

-- Schema initialization complete
