-- =============================================================================
-- CRYPTO SIMULATION PLATFORM - SEED DATA
-- Initial data for tier definitions, trading pairs, and achievements
-- =============================================================================

-- =============================================================================
-- TIER DEFINITIONS
-- =============================================================================

INSERT INTO tier_definitions (
    tier, name, price_monthly, price_yearly, 
    starting_balance, monthly_bonus, 
    max_concurrent_trades, advanced_charts, strategy_builder_access, api_access,
    free_contest_entries_per_month, paid_contest_discount_percent,
    private_chat_rooms, mentor_access,
    advanced_analytics, historical_data_years,
    priority_support
) VALUES
(
    'free', 'Free Tier', 0.00, 0.00,
    1000000, 0,
    10, false, false, false,
    5, 0,
    false, false,
    false, 1,
    false
),
(
    'pro', 'Pro Trader', 9.99, 99.99,
    2500000, 500000,
    50, true, true, false,
    10, 10,
    false, false,
    true, 3,
    false
),
(
    'elite', 'Elite Trader', 29.99, 299.99,
    10000000, 2000000,
    200, true, true, false,
    20, 25,
    true, true,
    true, 5,
    true
),
(
    'valkyrie', 'Valkyrie Command', 99.00, 999.00,
    50000000, 10000000,
    -1, true, true, true,
    -1, 50,
    true, true,
    true, 10,
    true
);

-- =============================================================================
-- TRADING PAIRS (CRYPTOCURRENCIES)
-- =============================================================================

INSERT INTO trading_pairs (symbol, base_asset, quote_asset, name, is_active, min_order_size, max_order_size, price_decimals) VALUES
-- Major Pairs
('BTCUSD', 'BTC', 'USD', 'Bitcoin', true, 0.0001, 100, 2),
('ETHUSD', 'ETH', 'USD', 'Ethereum', true, 0.001, 1000, 2),
('SOLUSD', 'SOL', 'USD', 'Solana', true, 0.01, 10000, 2),
('ADAUSD', 'ADA', 'USD', 'Cardano', true, 1, 100000, 4),
('DOTUSD', 'DOT', 'USD', 'Polkadot', true, 0.1, 10000, 3),
('XRPUSD', 'XRP', 'USD', 'Ripple', true, 1, 100000, 4),

-- Popular Altcoins
('AVAXUSD', 'AVAX', 'USD', 'Avalanche', true, 0.1, 10000, 2),
('MATICUSD', 'MATIC', 'USD', 'Polygon', true, 1, 100000, 4),
('LINKUSD', 'LINK', 'USD', 'Chainlink', true, 0.1, 10000, 3),
('UNIUSD', 'UNI', 'USD', 'Uniswap', true, 0.1, 10000, 3),
('LTCUSD', 'LTC', 'USD', 'Litecoin', true, 0.01, 1000, 2),
('BCHUSD', 'BCH', 'USD', 'Bitcoin Cash', true, 0.01, 1000, 2),

-- Stablecoins (for practice)
('USDTUSD', 'USDT', 'USD', 'Tether', true, 1, 1000000, 4),
('USDCUSD', 'USDC', 'USD', 'USD Coin', true, 1, 1000000, 4),

-- Meme Coins
('DOGEUSD', 'DOGE', 'USD', 'Dogecoin', true, 10, 1000000, 5),
('SHIBUSD', 'SHIB', 'USD', 'Shiba Inu', true, 1000, 10000000, 6);

-- =============================================================================
-- ACHIEVEMENTS
-- =============================================================================

-- Trading Milestones
INSERT INTO achievements (code, name, description, category, rarity, sim_currency_reward, xp_reward, is_secret) VALUES
('first_trade', 'First Trade', 'Execute your first simulated trade', 'milestone', 'common', 100000, 50, false),
('first_profit', 'First Profit', 'Make your first profitable trade', 'trading', 'common', 250000, 100, false),
('trades_10', 'Getting Started', 'Complete 10 trades', 'milestone', 'common', 500000, 150, false),
('trades_50', 'Active Trader', 'Complete 50 trades', 'milestone', 'rare', 2500000, 500, false),
('trades_100', 'Veteran Trader', 'Complete 100 trades', 'milestone', 'rare', 5000000, 1000, false),
('trades_500', 'Trading Master', 'Complete 500 trades', 'milestone', 'epic', 25000000, 5000, false),
('trades_1000', 'Trading Legend', 'Complete 1,000 trades', 'milestone', 'legendary', 100000000, 10000, false),

-- Profit Milestones
('profit_10pct', '10% Profit', 'Achieve 10% portfolio growth', 'trading', 'common', 1000000, 200, false),
('profit_50pct', '50% Profit', 'Achieve 50% portfolio growth', 'trading', 'rare', 5000000, 1000, false),
('profit_100pct', 'Portfolio Doubler', 'Double your starting balance', 'trading', 'epic', 10000000, 2500, false),
('profit_500pct', 'Whale Status', '5x your starting balance', 'trading', 'legendary', 50000000, 10000, false),
('profit_1000pct', 'Crypto King', '10x your starting balance', 'trading', 'valkyrie', 250000000, 25000, false),

-- Win Rate Achievements
('winrate_60', 'Consistent Trader', 'Achieve 60% win rate over 50 trades', 'trading', 'rare', 5000000, 1500, false),
('winrate_70', 'Expert Trader', 'Achieve 70% win rate over 100 trades', 'trading', 'epic', 15000000, 5000, false),
('winrate_80', 'Trading Genius', 'Achieve 80% win rate over 100 trades', 'trading', 'legendary', 50000000, 15000, false),

-- Contest Achievements
('contest_first', 'Contest Debut', 'Enter your first contest', 'contest', 'common', 500000, 100, false),
('contest_winner_gold', 'Gold Champion', 'Win 1st place in any contest', 'contest', 'legendary', 100000000, 10000, false),
('contest_winner_silver', 'Silver Medalist', 'Win 2nd place in any contest', 'contest', 'epic', 50000000, 5000, false),
('contest_winner_bronze', 'Bronze Trophy', 'Win 3rd place in any contest', 'contest', 'rare', 25000000, 2500, false),
('contest_top10', 'Top 10 Finish', 'Finish in top 10 of any contest', 'contest', 'common', 5000000, 500, false),
('contest_streak_3', 'Triple Threat', 'Top 3 finish in 3 consecutive contests', 'contest', 'legendary', 200000000, 20000, false),

-- Social Achievements
('profile_complete', 'Profile Setup', 'Complete your profile information', 'social', 'common', 250000, 50, false),
('first_follower', 'First Follower', 'Get your first follower', 'social', 'common', 500000, 100, false),
('followers_10', 'Rising Influence', 'Reach 10 followers', 'social', 'rare', 2500000, 500, false),
('followers_100', 'Social Trader', 'Reach 100 followers', 'social', 'epic', 10000000, 2500, false),
('strategy_shared', 'Strategy Sharer', 'Publish your first public strategy', 'social', 'common', 1000000, 200, false),
('strategy_copied_10', 'Influencer', '10 users copied your strategy', 'social', 'rare', 5000000, 1000, false),
('mentor', 'Mentor', 'Help 25 users with strategy advice', 'social', 'epic', 25000000, 5000, false),

-- Education Achievements
('lesson_first', 'Student', 'Complete your first lesson', 'milestone', 'common', 250000, 50, false),
('module_complete', 'Graduate', 'Complete an entire education module', 'milestone', 'common', 1000000, 250, false),
('quiz_perfect', 'Perfect Score', 'Get 100% on a quiz', 'milestone', 'common', 500000, 150, false),
('education_master', 'Education Master', 'Complete all education modules', 'milestone', 'legendary', 50000000, 10000, false),

-- Special/Secret Achievements
('founding_member', 'Founding Member', 'Joined during platform launch', 'special', 'valkyrie', 500000000, 50000, false),
('early_adopter', 'Early Adopter', 'Joined in first month', 'special', 'legendary', 100000000, 10000, false),
('diamond_hands', 'Diamond Hands', 'Hold a position through 50%+ drawdown and still profit', 'special', 'legendary', 75000000, 15000, true),
('day_trader', 'Day Trader', 'Execute 10 trades in one day', 'trading', 'common', 2500000, 500, false),
('night_owl', 'Night Owl', 'Execute trades between midnight and 6am', 'special', 'rare', 5000000, 1000, true),
('hodler', 'HODL Master', 'Hold a position for 90+ days and profit', 'special', 'epic', 25000000, 5000, true),
('whale_trade', 'Whale Trade', 'Execute a single trade worth $1M+ sim currency', 'trading', 'epic', 10000000, 2500, false),
('comeback', 'Phoenix Rising', 'Recover from 80% portfolio loss', 'special', 'legendary', 100000000, 20000, true),
('all_pairs', 'Diversified', 'Trade at least 10 different pairs', 'trading', 'rare', 10000000, 2000, false),
('perfect_week', 'Perfect Week', '7 consecutive profitable days', 'trading', 'epic', 50000000, 10000, false);

-- =============================================================================
-- SAMPLE EDUCATION MODULE (Crypto Basics)
-- =============================================================================

INSERT INTO education_modules (title, description, difficulty, order_index, xp_reward, sim_currency_reward, estimated_time_minutes) VALUES
('Crypto Basics', 'Learn the fundamentals of cryptocurrency and blockchain technology', 'beginner', 1, 500, 500000, 30);

-- Get the module ID for lessons
DO $$
DECLARE
    module_id UUID;
BEGIN
    SELECT id INTO module_id FROM education_modules WHERE title = 'Crypto Basics';
    
    -- Lesson 1
    INSERT INTO education_lessons (module_id, title, content, order_index) VALUES
    (module_id, 'What is Bitcoin?', 
    E'# What is Bitcoin?\n\nBitcoin is the first decentralized cryptocurrency, created in 2009 by an anonymous person or group known as Satoshi Nakamoto.\n\n## Key Concepts:\n\n- **Decentralized**: No central authority controls Bitcoin\n- **Blockchain**: A public ledger of all transactions\n- **Limited Supply**: Only 21 million bitcoins will ever exist\n- **Peer-to-Peer**: Transactions occur directly between users\n\n## Why Bitcoin Matters:\n\nBitcoin introduced the concept of digital scarcity and trustless transactions, paving the way for thousands of other cryptocurrencies.',
    1);
    
    -- Lesson 2
    INSERT INTO education_lessons (module_id, title, content, order_index) VALUES
    (module_id, 'Understanding Blockchain', 
    E'# Understanding Blockchain\n\nBlockchain is the underlying technology that makes cryptocurrencies possible.\n\n## How It Works:\n\n1. **Blocks**: Transactions are grouped into blocks\n2. **Chain**: Each block is cryptographically linked to the previous one\n3. **Distributed**: The blockchain is stored on thousands of computers\n4. **Immutable**: Once recorded, data cannot be altered\n\n## Benefits:\n\n- Transparency\n- Security\n- No single point of failure\n- Censorship resistance',
    2);
    
    -- Quiz questions
    INSERT INTO education_quizzes (lesson_id, question, options, correct_answer, explanation) 
    SELECT id, 
           'What is the maximum supply of Bitcoin?',
           '["A) 21 billion", "B) 21 million", "C) 100 million", "D) Unlimited"]'::jsonb,
           'B',
           'Bitcoin has a hard cap of 21 million coins, making it a scarce digital asset.'
    FROM education_lessons WHERE title = 'What is Bitcoin?';
    
    INSERT INTO education_quizzes (lesson_id, question, options, correct_answer, explanation)
    SELECT id,
           'What makes blockchain secure?',
           '["A) Password protection", "B) Encryption only", "C) Cryptographic linking and distribution", "D) Government oversight"]'::jsonb,
           'C',
           'Blockchain security comes from cryptographic linking of blocks and distribution across many nodes.'
    FROM education_lessons WHERE title = 'Understanding Blockchain';
END $$;

-- =============================================================================
-- PLACEHOLDER BACKUPS DIRECTORY
-- =============================================================================

-- Note: This will be created by the backup script
-- For now, just document it
COMMENT ON SCHEMA public IS 'Main schema for Crypto Simulation Platform - Seed data loaded';
