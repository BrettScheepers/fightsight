-- FightSight Database Initialization Script
-- Creates extensions and base schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE stance_type AS ENUM ('orthodox', 'southpaw', 'switch');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE strike_category AS ENUM ('hand', 'kick', 'elbow', 'knee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE target_zone AS ENUM ('head', 'body', 'legs');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE strike_outcome AS ENUM (
        'landed_clean',
        'partially_landed',
        'blocked',
        'slipped',
        'parried',
        'rolled',
        'missed',
        'countered'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE combat_sport AS ENUM (
        'boxing',
        'kickboxing',
        'muay_thai',
        'mma',
        'karate',
        'taekwondo'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE analysis_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Set timezone
SET timezone = 'UTC';

-- Create schema version table
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Insert initial version
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial database setup with custom types')
ON CONFLICT (version) DO NOTHING;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'FightSight database initialized successfully';
END $$;
