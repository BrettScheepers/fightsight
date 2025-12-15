# Testing FightSight UI with Mock Data

**Date:** 2025-12-11
**Purpose:** Enable UI testing without implementing the full video processing worker

---

## Overview

Since the video processing worker is not yet implemented, we've created a seed script that generates realistic mock analysis data. This allows you to test the complete UI flow from landing page through to results display.

---

## What Was Created

### Seed Script

**File:** `services/api/src/scripts/seed-mock-data.ts`

**What it does:**
1. Creates a test user (if doesn't exist)
2. Creates a mock video record
3. Creates a completed analysis session
4. Creates two session fighters (Fighter A and Fighter B)
5. Generates 84 realistic strike events with various techniques:
   - Jabs: 45
   - Crosses: 28
   - Left hooks: 16
   - Right hooks: 12
   - Uppercuts: 11
   - Body shots: 9
   - Overhands: 6
6. Creates 3 combination sequences
7. Generates an AI analysis report with insights

### Mock Data Statistics

- **Video Duration:** 3 minutes (180.5 seconds)
- **Total Strikes:** 84
- **Total Combinations:** 3
- **Fighter A Stats:**
  - Thrown: 89
  - Landed: 65
  - Received: 38
- **Fighter B Stats:**
  - Thrown: 78
  - Landed: 62
  - Received: 65

---

## How to Use

### Running the Seed Script

```bash
# Run inside the API Docker container
docker exec fightsight-api npm run db:seed
```

**Output:**
```
🌱 Seeding mock analysis data...
✅ Created mock video: <video-id>
✅ Created analysis session: <session-id>
✅ Created session fighters
✅ Created 84 strike events
✅ Created 3 combinations
✅ Created analysis report

🎉 Mock data seeding complete!

📊 Summary:
   Video ID: 454afcb0-8bfc-461e-a5db-e15867dbead7
   Analysis Session ID: bead726b-be76-4c6a-bbb4-66783259f0fa
   Total Strikes: 84
   Total Combinations: 3

🔗 Test the results page:
   http://localhost:3001/results/454afcb0-8bfc-461e-a5db-e15867dbead7
```

### Testing the UI Flow

1. **Visit the landing page:**
   ```
   http://localhost:3001
   ```
   - Should see clean hero section with "Upload Your First Video" button

2. **Go to upload page:**
   ```
   http://localhost:3001/upload
   ```
   - Can test file selection (but upload won't process since worker isn't built)

3. **View mock results directly:**
   ```
   http://localhost:3001/results/<video-id>
   ```
   - Use the video ID from the seed script output
   - Should see:
     - ✅ "Analysis Complete" header
     - 📊 Overview card with total strikes
     - 🎯 Strike breakdown with visual bars
     - Red color scheme throughout

### API Testing

Test the API endpoint directly:

```bash
# Get analysis data
curl http://localhost:3000/api/videos/<video-id>/analysis | jq

# Get video status
curl http://localhost:3000/api/videos/<video-id>/status | jq
```

---

## Mock Data Details

### Strike Distribution

The seed script generates strikes with realistic patterns:

| Technique | Count | Percentage |
|-----------|-------|------------|
| Jab | 45 | 53.6% |
| Cross | 28 | 33.3% |
| Left Hook | 16 | 19.0% |
| Right Hook | 12 | 14.3% |
| Uppercut | 11 | 13.1% |
| Body Shot | 9 | 10.7% |
| Overhand | 6 | 7.1% |

### Strike Outcomes

Randomly distributed across:
- `landed_clean` (most common)
- `partially_landed`
- `blocked`
- `slipped`
- `missed`

### Target Zones

- **Head:** ~75% of strikes
- **Body:** ~25% of strikes

### Combinations

Three pre-defined combinations:
1. **Jab-Cross-Hook** (3 strikes, 2 landed)
2. **Double Jab-Cross-Hook** (4 strikes, 3 landed)
3. **Cross-Hook** (2 strikes, 2 landed)

---

## Running Multiple Times

You can run the seed script multiple times to create different mock videos:

```bash
# Each run creates a new video and analysis
docker exec fightsight-api npm run db:seed
docker exec fightsight-api npm run db:seed
docker exec fightsight-api npm run db:seed
```

Each execution will output a new video ID to test with.

---

## Cleaning Up Mock Data

To remove all seeded data:

```bash
# Connect to PostgreSQL
docker exec -it fightsight-postgres psql -U fightsight -d fightsight

# Delete all mock data
DELETE FROM strike_events WHERE analysis_session_id IN (
  SELECT id FROM analysis_sessions WHERE video_id IN (
    SELECT id FROM videos WHERE original_filename = 'mock-sparring-session.mp4'
  )
);

DELETE FROM combinations WHERE analysis_session_id IN (
  SELECT id FROM analysis_sessions WHERE video_id IN (
    SELECT id FROM videos WHERE original_filename = 'mock-sparring-session.mp4'
  )
);

DELETE FROM analysis_reports WHERE analysis_session_id IN (
  SELECT id FROM analysis_sessions WHERE video_id IN (
    SELECT id FROM videos WHERE original_filename = 'mock-sparring-session.mp4'
  )
);

DELETE FROM session_fighters WHERE analysis_session_id IN (
  SELECT id FROM analysis_sessions WHERE video_id IN (
    SELECT id FROM videos WHERE original_filename = 'mock-sparring-session.mp4'
  )
);

DELETE FROM analysis_sessions WHERE video_id IN (
  SELECT id FROM videos WHERE original_filename = 'mock-sparring-session.mp4'
);

DELETE FROM videos WHERE original_filename = 'mock-sparring-session.mp4';
```

Or use Prisma Studio for a GUI:

```bash
docker exec fightsight-api npm run db:studio
```

---

## What This Enables

✅ **Test complete UI flow** without implementing worker
✅ **Demo the results page** to stakeholders
✅ **Verify data visualization** works correctly
✅ **Test responsive design** with real data structures
✅ **Validate API integration** between frontend and backend

---

## What's Still Missing

❌ **Actual video upload processing** - Files upload but aren't analyzed
❌ **Worker service** - No job queue processing
❌ **CV service integration** - No frame extraction or analysis
❌ **Real-time status updates** - Can't watch processing happen

---

## Next Steps

Once you're satisfied with the UI using mock data, you'll need to implement:

1. **Worker Service** (`services/api/src/worker.ts`)
   - Poll Redis queue for pending jobs
   - Extract frames from video
   - Call CV service for analysis
   - Store results in database
   - Update status from pending → processing → completed

2. **CV Service Integration**
   - Connect to Python CV service
   - Send frames for analysis
   - Parse and store strike detection results

3. **Job Queue System**
   - Redis/Bull queue setup
   - Job creation on upload
   - Job status tracking

---

## Success Criteria

Your UI is fully functional when you can:

1. ✅ View landing page
2. ✅ Navigate to upload page
3. ✅ View mock results page with proper data visualization
4. ⏳ Upload a real video (uploads but doesn't process)
5. ⏳ See processing status update in real-time (when worker is built)
6. ⏳ Auto-redirect to results when complete (when worker is built)
7. ⏳ View real analysis results (when worker is built)

**Current Status:** 3 out of 7 complete with mock data! 🎉
