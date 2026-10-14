-- MessPulse Database Schema v1.0
-- CUTM Mess Management System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Enum types
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('student', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meal_slot_enum AS ENUM ('breakfast', 'lunch', 'snacks', 'dinner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE day_of_week_enum AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_category_enum AS ENUM ('food_quality', 'hygiene', 'quantity', 'service', 'timing', 'suggestion', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status_enum AS ENUM ('pending', 'reviewed', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_no CITEXT UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Meal Slots Master Table
CREATE TABLE IF NOT EXISTS meal_slots (
    key meal_slot_enum PRIMARY KEY,
    label VARCHAR(30) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    display_order SMALLINT NOT NULL
);

-- Seed static meal slot definitions
INSERT INTO meal_slots (key, label, start_time, end_time, emoji, display_order)
VALUES
    ('breakfast', 'Breakfast', '08:00:00', '09:30:00', '🌅', 1),
    ('lunch',     'Lunch',     '12:00:00', '14:00:00', '☀️', 2),
    ('snacks',    'Snacks',    '17:00:00', '18:00:00', '🍩', 3),
    ('dinner',    'Dinner',    '20:00:00', '22:00:00', '🌙', 4)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    emoji = EXCLUDED.emoji,
    display_order = EXCLUDED.display_order;

-- 3. Dishes Master Catalog
CREATE TABLE IF NOT EXISTS dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name CITEXT UNIQUE NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '🍽️',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Weekly Menu Items Junction Table
CREATE TABLE IF NOT EXISTS weekly_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week day_of_week_enum NOT NULL,
    meal_slot meal_slot_enum NOT NULL REFERENCES meal_slots(key) ON UPDATE CASCADE ON DELETE RESTRICT,
    dish_id UUID NOT NULL REFERENCES dishes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_weekly_menu_day_slot_dish UNIQUE (day_of_week, meal_slot, dish_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_menu_day_slot ON weekly_menu_items (day_of_week, meal_slot);

-- 5. Meal Ratings Table
CREATE TABLE IF NOT EXISTS meal_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_slot meal_slot_enum NOT NULL REFERENCES meal_slots(key) ON UPDATE CASCADE ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_daily_meal_rating UNIQUE (user_id, rating_date, meal_slot)
);

CREATE INDEX IF NOT EXISTS idx_ratings_date_meal ON meal_ratings (rating_date, meal_slot);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON meal_ratings (user_id);

-- 6. Dish Votes Table (1 vote per user per dish per day)
CREATE TABLE IF NOT EXISTS dish_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    vote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_slot meal_slot_enum NOT NULL REFERENCES meal_slots(key) ON UPDATE CASCADE ON DELETE RESTRICT,
    vote_type SMALLINT NOT NULL CONSTRAINT chk_vote_type CHECK (vote_type IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_daily_dish_vote UNIQUE (user_id, dish_id, vote_date)
);

CREATE INDEX IF NOT EXISTS idx_votes_date_dish ON dish_votes (vote_date, dish_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_date ON dish_votes (user_id, vote_date);

-- 7. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category feedback_category_enum NOT NULL,
    message VARCHAR(500) NOT NULL CONSTRAINT chk_feedback_length CHECK (char_length(TRIM(message)) >= 10),
    status feedback_status_enum NOT NULL DEFAULT 'pending',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_active ON feedback (created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback (user_id) WHERE is_deleted = FALSE;
