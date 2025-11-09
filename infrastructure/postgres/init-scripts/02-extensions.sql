-- FightSight Additional Extensions
-- This file is sourced after 01-init.sql

-- Enable pg_trgm for fuzzy text search (fighter names, etc.)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for composite indexes on JSONB
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Log extensions loaded
DO $$
BEGIN
    RAISE NOTICE 'Additional extensions loaded successfully';
END $$;
