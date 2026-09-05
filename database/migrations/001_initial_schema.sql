-- SIGNAL Database Migration 001: Initial Schema
-- PostgreSQL / Supabase schema with Row Level Security (RLS)

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    default_market TEXT DEFAULT 'NSE',
    default_watchlist_id UUID,
    currency TEXT DEFAULT 'INR',
    data_mode TEXT DEFAULT 'LIVE',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    important_signals BOOLEAN DEFAULT TRUE,
    high_attention_only BOOLEAN DEFAULT FALSE,
    daily_summary BOOLEAN DEFAULT TRUE,
    while_away_summary BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Last Seen
CREATE TABLE IF NOT EXISTS user_last_seen (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_change_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Instruments
CREATE TABLE IF NOT EXISTS instruments (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    exchange TEXT DEFAULT 'NSE',
    sector TEXT NOT NULL,
    industry TEXT,
    lot_size INT DEFAULT 1,
    base_price NUMERIC(12, 2) NOT NULL,
    average_daily_volume BIGINT,
    baseline_volatility NUMERIC(6, 4),
    market_cap_category TEXT DEFAULT 'LARGE_CAP',
    benchmark_symbol TEXT DEFAULT 'NIFTY50',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Watchlist Stocks
CREATE TABLE IF NOT EXISTS watchlist_stocks (
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES instruments(symbol) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (watchlist_id, symbol)
);

-- 8. Market Snapshots
CREATE TABLE IF NOT EXISTS market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    change_percent NUMERIC(8, 4),
    volume BIGINT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_symbol_ts ON market_snapshots(symbol, timestamp DESC);

-- 9. Market Events
CREATE TABLE IF NOT EXISTS market_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    event_type TEXT NOT NULL,
    headline TEXT NOT NULL,
    details JSONB,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Meaningful Changes (Core Signal Engine Table)
CREATE TABLE IF NOT EXISTS meaningful_changes (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    classification TEXT NOT NULL,
    reasons JSONB NOT NULL,
    summary TEXT NOT NULL,
    ai_explanation TEXT,
    price NUMERIC(12, 2) NOT NULL,
    change_percent NUMERIC(8, 4) NOT NULL,
    volume_multiple NUMERIC(8, 2) NOT NULL,
    market_change_percent NUMERIC(8, 4) NOT NULL,
    sector_change_percent NUMERIC(8, 4) NOT NULL,
    sector TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meaningful_changes_ts ON meaningful_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_meaningful_changes_score ON meaningful_changes(score DESC);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_last_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own watchlists" ON watchlists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlists" ON watchlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own watchlist stocks" ON watchlist_stocks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_stocks.watchlist_id AND watchlists.user_id = auth.uid())
    );
CREATE POLICY "Users can manage own watchlist stocks" ON watchlist_stocks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_stocks.watchlist_id AND watchlists.user_id = auth.uid())
    );
