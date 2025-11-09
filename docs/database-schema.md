# FightSight Database Schema Design

**Version**: 1.0
**Database**: PostgreSQL 16
**Primary Keys**: UUID (generated at database level)
**Normalization**: 3NF (Third Normal Form)

---

## Overview

The FightSight database is designed to store:
- User accounts and authentication
- Video uploads and metadata
- Analysis sessions (one per video)
- Fighter profiles
- Strike events with full detail
- Combination sequences
- Analysis results and reports

---

## Core Design Principles

1. **UUID Primary Keys**: All tables use `uuid_generate_v4()` for primary keys
2. **Normalized to 3NF**: No transitive dependencies, minimal redundancy
3. **Proper Foreign Keys**: All relationships enforced with constraints
4. **Audit Fields**: `created_at`, `updated_at` on all tables
5. **Soft Deletes**: `deleted_at` for important entities
6. **Indexing Strategy**: Foreign keys, lookup fields, and query patterns
7. **ENUM Types**: PostgreSQL custom types for fixed value sets

---

## Entity Relationship Diagram (Text Format)

```
users
  ├─→ videos (user_id)
  └─→ fighter_profiles (created_by_user_id)

videos
  └─→ analysis_sessions (video_id)

analysis_sessions
  ├─→ session_fighters (analysis_session_id)
  ├─→ strike_events (analysis_session_id)
  └─→ analysis_reports (analysis_session_id)

session_fighters
  ├─→ fighter_profiles (fighter_profile_id) [optional]
  └─→ strike_events (thrower_id, receiver_id)

strike_events
  ├─→ analysis_sessions (analysis_session_id)
  ├─→ session_fighters (thrower_id, receiver_id)
  └─→ combinations (via combination_strikes join table)

combinations
  ├─→ analysis_sessions (analysis_session_id)
  ├─→ session_fighters (thrower_id)
  └─→ strike_events (via combination_strikes)

combination_strikes (join table)
  ├─→ combinations (combination_id)
  └─→ strike_events (strike_event_id)

analysis_reports
  └─→ analysis_sessions (analysis_session_id)
```

---

## Table Definitions

### 1. users

Stores user accounts and authentication information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' NOT NULL, -- user, admin
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Normalization Notes**:
- Email is unique and indexed for fast lookup
- Password stored as hash (never plaintext)
- Role could be separate table if roles expand, but keeping simple for MVP

---

### 2. videos

Stores uploaded video files and metadata.

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL, -- S3 key or local path
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Video Metadata
    duration_seconds DECIMAL(10, 2) NOT NULL,
    width INTEGER,
    height INTEGER,
    fps DECIMAL(6, 2),

    -- Processing Status
    upload_status VARCHAR(50) DEFAULT 'uploading' NOT NULL, -- uploading, completed, failed

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_videos_user_id ON videos(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_videos_upload_status ON videos(upload_status);
CREATE INDEX idx_videos_created_at ON videos(created_at);
```

**Normalization Notes**:
- Separate from analysis_sessions because a video could potentially be analyzed multiple times
- Storage path abstracted (works for S3 or local)
- Upload status separate from analysis status

---

### 3. analysis_sessions

Core table representing one analysis of a video.

```sql
CREATE TABLE analysis_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session Configuration
    sport_type combat_sport NOT NULL, -- boxing, kickboxing, muay_thai, mma, etc.
    round_count INTEGER DEFAULT 1,

    -- Processing Status
    status analysis_status DEFAULT 'pending' NOT NULL, -- pending, processing, completed, failed
    progress_percentage INTEGER DEFAULT 0,

    -- Processing Metadata
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- Cost Tracking
    total_cost_usd DECIMAL(10, 4),
    llm_provider VARCHAR(50), -- anthropic, openai, google
    llm_model VARCHAR(100),
    total_llm_api_calls INTEGER DEFAULT 0,

    -- Processing Stats
    total_frames_analyzed INTEGER,
    total_strikes_detected INTEGER,
    total_combinations_detected INTEGER,
    processing_time_seconds INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_analysis_sessions_video_id ON analysis_sessions(video_id);
CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX idx_analysis_sessions_created_at ON analysis_sessions(created_at);
```

**Normalization Notes**:
- One session = one analysis run
- Links to both video and user (user can analyze others' videos if shared)
- All processing metadata kept here for audit/debugging
- Cost tracking for financial reporting

---

### 4. fighter_profiles (Optional Master Data)

Optional table for reusable fighter profiles across sessions.

```sql
CREATE TABLE fighter_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Fighter Information
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    default_stance stance_type, -- orthodox, southpaw, switch

    -- Optional Profile Data
    weight_class VARCHAR(100),
    team_gym VARCHAR(255),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_fighter_profiles_name ON fighter_profiles(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_fighter_profiles_user_id ON fighter_profiles(created_by_user_id);
```

**Normalization Notes**:
- Separate from session_fighters to avoid duplication
- User can create reusable fighter profiles
- Optional relationship - can analyze without creating profiles

---

### 5. session_fighters

Fighters in a specific analysis session (transactional data).

```sql
CREATE TABLE session_fighters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    fighter_profile_id UUID REFERENCES fighter_profiles(id) ON DELETE SET NULL,

    -- Fighter Identification
    fighter_label VARCHAR(50) NOT NULL, -- 'fighter_a', 'fighter_b'
    corner_color VARCHAR(50), -- 'red', 'blue', etc.

    -- Session-Specific Data
    display_name VARCHAR(255) NOT NULL,
    stance stance_type NOT NULL,

    -- Calculated Stats (denormalized for performance)
    total_strikes_thrown INTEGER DEFAULT 0,
    total_strikes_landed INTEGER DEFAULT 0,
    total_strikes_received INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_fighter_per_session UNIQUE(analysis_session_id, fighter_label)
);

CREATE INDEX idx_session_fighters_session_id ON session_fighters(analysis_session_id);
CREATE INDEX idx_session_fighters_profile_id ON session_fighters(fighter_profile_id);
```

**Normalization Notes**:
- Links session to fighter_profiles (optional)
- Stores session-specific fighter data (might differ from profile)
- Stats denormalized for performance (calculated after analysis)
- fighter_label ensures we can reference "fighter_a" consistently

---

### 6. strike_events

Core table storing individual strike events (most queried table).

```sql
CREATE TABLE strike_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,

    -- Temporal Data
    timestamp_seconds DECIMAL(10, 3) NOT NULL, -- 00:00.000
    frame_number INTEGER NOT NULL,
    round_number INTEGER DEFAULT 1,

    -- Fighter References
    thrower_id UUID NOT NULL REFERENCES session_fighters(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES session_fighters(id) ON DELETE CASCADE,
    thrower_stance stance_type NOT NULL,

    -- Strike Classification
    strike_category strike_category NOT NULL, -- hand, kick, elbow, knee
    technique VARCHAR(100) NOT NULL, -- jab, cross, hook, roundhouse, etc.
    modifier VARCHAR(100), -- lead, rear, switch, spinning, jumping

    -- Target & Impact
    target_zone target_zone NOT NULL, -- head, body, legs
    outcome strike_outcome NOT NULL, -- landed_clean, blocked, slipped, etc.

    -- Contextual Data
    range VARCHAR(50), -- pocket, mid_range, long_range
    initiated_from VARCHAR(50), -- offense, counter, defensive_response

    -- Combination Relationship (nullable, populated after combination detection)
    is_part_of_combination BOOLEAN DEFAULT FALSE,
    position_in_combination INTEGER, -- 1st, 2nd, 3rd strike in combo

    -- Frame Reference (for review/validation)
    frame_storage_path VARCHAR(500), -- Path to frame image

    -- Confidence/Quality Metrics
    detection_confidence DECIMAL(4, 3), -- 0.000 to 1.000
    classification_confidence DECIMAL(4, 3),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Performance-critical indexes
CREATE INDEX idx_strike_events_session_id ON strike_events(analysis_session_id);
CREATE INDEX idx_strike_events_thrower_id ON strike_events(thrower_id);
CREATE INDEX idx_strike_events_receiver_id ON strike_events(receiver_id);
CREATE INDEX idx_strike_events_timestamp ON strike_events(timestamp_seconds);
CREATE INDEX idx_strike_events_technique ON strike_events(technique);
CREATE INDEX idx_strike_events_outcome ON strike_events(outcome);
CREATE INDEX idx_strike_events_target_zone ON strike_events(target_zone);

-- Composite indexes for common queries
CREATE INDEX idx_strike_events_session_timestamp ON strike_events(analysis_session_id, timestamp_seconds);
CREATE INDEX idx_strike_events_thrower_technique ON strike_events(thrower_id, technique);
```

**Normalization Notes**:
- No transitive dependencies
- All foreign keys properly constrained
- Combination membership tracked via separate junction table
- Confidence scores for ML validation
- Heavily indexed for analytics queries

---

### 7. combinations

Detected combination sequences.

```sql
CREATE TABLE combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    thrower_id UUID NOT NULL REFERENCES session_fighters(id) ON DELETE CASCADE,

    -- Temporal Bounds
    start_timestamp_seconds DECIMAL(10, 3) NOT NULL,
    end_timestamp_seconds DECIMAL(10, 3) NOT NULL,
    duration_seconds DECIMAL(6, 3) NOT NULL,

    -- Combination Metadata
    strike_count INTEGER NOT NULL,
    combination_name VARCHAR(255), -- "1-2 combo", "jab-cross-hook", etc.

    -- Effectiveness
    strikes_landed INTEGER DEFAULT 0,
    strikes_missed INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_combinations_session_id ON combinations(analysis_session_id);
CREATE INDEX idx_combinations_thrower_id ON combinations(thrower_id);
CREATE INDEX idx_combinations_start_time ON combinations(start_timestamp_seconds);
```

**Normalization Notes**:
- Separate from strike_events to avoid redundancy
- Links to strikes via junction table
- Metadata derived from linked strikes

---

### 8. combination_strikes (Junction Table)

Many-to-many relationship between combinations and strikes.

```sql
CREATE TABLE combination_strikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
    strike_event_id UUID NOT NULL REFERENCES strike_events(id) ON DELETE CASCADE,
    position_in_sequence INTEGER NOT NULL, -- 1, 2, 3, etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_strike_position UNIQUE(combination_id, position_in_sequence),
    CONSTRAINT unique_strike_in_combo UNIQUE(combination_id, strike_event_id)
);

CREATE INDEX idx_combination_strikes_combo_id ON combination_strikes(combination_id);
CREATE INDEX idx_combination_strikes_strike_id ON combination_strikes(strike_event_id);
```

**Normalization Notes**:
- Pure junction table (no additional data)
- Position tracked here, not in strike_events
- Unique constraints prevent duplicate assignments

---

### 9. analysis_reports

Generated reports and insights.

```sql
CREATE TABLE analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,

    -- Report Content
    report_type VARCHAR(50) NOT NULL, -- summary, detailed, coaching, comparison
    report_format VARCHAR(50) NOT NULL, -- json, markdown, html, pdf

    -- Report Data
    content_json JSONB, -- Structured report data
    content_text TEXT, -- Markdown/HTML/text content

    -- Insights (LLM-generated)
    key_insights TEXT[],
    strengths TEXT[],
    areas_for_improvement TEXT[],

    -- Metadata
    generated_by_llm_provider VARCHAR(50),
    generated_by_llm_model VARCHAR(100),
    generation_cost_usd DECIMAL(8, 4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_analysis_reports_session_id ON analysis_reports(analysis_session_id);
CREATE INDEX idx_analysis_reports_type ON analysis_reports(report_type);

-- GIN index for JSONB queries (if needed)
CREATE INDEX idx_analysis_reports_content_json ON analysis_reports USING GIN(content_json);
```

**Normalization Notes**:
- Separate from sessions to support multiple report types
- JSONB for flexible report structure
- Text arrays for list-based insights

---

## Custom PostgreSQL Types

Already defined in `infrastructure/postgres/init-scripts/01-init.sql`:

```sql
CREATE TYPE stance_type AS ENUM ('orthodox', 'southpaw', 'switch');

CREATE TYPE strike_category AS ENUM ('hand', 'kick', 'elbow', 'knee');

CREATE TYPE target_zone AS ENUM ('head', 'body', 'legs');

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

CREATE TYPE combat_sport AS ENUM (
    'boxing',
    'kickboxing',
    'muay_thai',
    'mma',
    'karate',
    'taekwondo'
);

CREATE TYPE analysis_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);
```

---

## Normalization Analysis

### First Normal Form (1NF) ✅
- All tables have primary keys
- All columns contain atomic values
- No repeating groups

### Second Normal Form (2NF) ✅
- All non-key attributes fully dependent on primary key
- No partial dependencies (all PKs are single UUID)

### Third Normal Form (3NF) ✅
- No transitive dependencies
- Examples:
  - Fighter stats denormalized in `session_fighters` for performance (acceptable trade-off)
  - Combination metadata could be calculated but stored for query performance

---

## Data Integrity Constraints

### Foreign Key Cascades

| Parent Table | Child Table | On Delete |
|--------------|-------------|-----------|
| users → videos | CASCADE | Delete user deletes their videos |
| videos → analysis_sessions | CASCADE | Delete video deletes analyses |
| analysis_sessions → strike_events | CASCADE | Delete session deletes all strikes |
| analysis_sessions → session_fighters | CASCADE | Delete session deletes fighters |
| combinations → combination_strikes | CASCADE | Delete combo deletes links |
| fighter_profiles → session_fighters | SET NULL | Preserve session data |

### Unique Constraints

- `users.email` - One email per user
- `session_fighters(analysis_session_id, fighter_label)` - One fighter_a, one fighter_b per session
- `combination_strikes(combination_id, position_in_sequence)` - No duplicate positions
- `combination_strikes(combination_id, strike_event_id)` - Strike can't appear twice in same combo

---

## Query Performance Optimization

### Indexing Strategy

1. **Primary Access Patterns**:
   - Get all strikes for a session: `idx_strike_events_session_id`
   - Get strikes by fighter: `idx_strike_events_thrower_id`
   - Get strikes in time range: `idx_strike_events_session_timestamp`

2. **Analytics Queries**:
   - Filter by technique: `idx_strike_events_technique`
   - Filter by outcome: `idx_strike_events_outcome`
   - Filter by target: `idx_strike_events_target_zone`

3. **Composite Indexes**:
   - Session + timestamp for timeline views
   - Thrower + technique for fighter analysis

### Denormalization Decisions

**Denormalized for Performance**:
- `session_fighters.total_strikes_*` - Calculated after analysis, faster than COUNT queries
- `combinations.strike_count` - Derived from junction table
- `combinations.strikes_landed` - Aggregation cache

**Stay Normalized**:
- Strike details - never duplicate
- Fighter relationships - proper foreign keys
- Temporal data - source of truth

---

## Sample Queries

### Get all strikes for a session with fighter names

```sql
SELECT
    se.id,
    se.timestamp_seconds,
    se.technique,
    se.target_zone,
    se.outcome,
    thrower.display_name AS thrower_name,
    receiver.display_name AS receiver_name
FROM strike_events se
JOIN session_fighters thrower ON se.thrower_id = thrower.id
JOIN session_fighters receiver ON se.receiver_id = receiver.id
WHERE se.analysis_session_id = 'session-uuid'
ORDER BY se.timestamp_seconds;
```

### Get fighter statistics

```sql
SELECT
    sf.display_name,
    sf.stance,
    COUNT(CASE WHEN se.outcome = 'landed_clean' THEN 1 END) AS clean_strikes,
    COUNT(CASE WHEN se.outcome = 'missed' THEN 1 END) AS missed_strikes,
    COUNT(se.id) AS total_strikes
FROM session_fighters sf
LEFT JOIN strike_events se ON se.thrower_id = sf.id
WHERE sf.analysis_session_id = 'session-uuid'
GROUP BY sf.id, sf.display_name, sf.stance;
```

### Get combinations with their strikes

```sql
SELECT
    c.id AS combo_id,
    c.combination_name,
    c.start_timestamp_seconds,
    se.technique,
    cs.position_in_sequence
FROM combinations c
JOIN combination_strikes cs ON cs.combination_id = c.id
JOIN strike_events se ON se.id = cs.strike_event_id
WHERE c.analysis_session_id = 'session-uuid'
ORDER BY c.start_timestamp_seconds, cs.position_in_sequence;
```

---

## Storage Estimates

### Per Session (4-minute video, ~60 strikes)

| Table | Rows | Size per Row | Total |
|-------|------|--------------|-------|
| videos | 1 | ~500 bytes | 500 B |
| analysis_sessions | 1 | ~800 bytes | 800 B |
| session_fighters | 2 | ~300 bytes | 600 B |
| strike_events | 60 | ~600 bytes | 36 KB |
| combinations | ~10 | ~300 bytes | 3 KB |
| combination_strikes | ~25 | ~100 bytes | 2.5 KB |
| analysis_reports | 1 | ~10 KB | 10 KB |
| **Total** | | | **~53 KB** |

**1000 sessions = ~53 MB** (excluding indexes, very scalable)

---

## Next Steps

1. ✅ Database design complete
2. ⏳ Create Prisma schema
3. ⏳ Generate SQL migration from Prisma
4. ⏳ Create seed data script
5. ⏳ Implement database access layer

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Designed By**: Winston (Architect)
