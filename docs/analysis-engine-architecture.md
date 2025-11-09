# Analysis Engine Architecture

**Project:** FightSight - Combat Sport Sparring Video Analysis
**Version:** 1.0
**Last Updated:** 2025-10-25

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decision: Hybrid Node.js + Python](#architecture-decision)
3. [Complete Data Flow](#complete-data-flow)
4. [Detailed Stage Breakdown](#detailed-stage-breakdown)
5. [Technology Stack](#technology-stack)
6. [Cost Analysis](#cost-analysis)
7. [Performance Targets](#performance-targets)
8. [Technical Decisions](#technical-decisions)
9. [Deployment Architecture](#deployment-architecture)
10. [Next Steps](#next-steps)

---

## Overview

FightSight processes 1-6 minute combat sport sparring videos to generate detailed strike analysis reports. The system uses a hybrid architecture combining:

- **Computer Vision** (MediaPipe) for motion detection and pose estimation
- **Large Language Models** (Claude/Gemini) for intelligent strike classification
- **Data enrichment** for combination detection and pattern analysis
- **LLM-powered reporting** for natural language insights

### Key Requirements

- **Cost Target:** <$1-2 per video analysis
- **Processing Time:** 5-10 minutes (30 min acceptable)
- **Accuracy Priority:** Correct strike identification is critical
- **Scale:** 5-20 videos/day (testing phase)
- **Video Length:** 1-6 minutes (client-side clipping)

---

## Architecture Decision

### Recommended: Hybrid Microservices Approach

```
┌─────────────────────────────────────────────────────────┐
│  Node.js/TypeScript (Main Application)                 │
│  ───────────────────────────────────────────────────── │
│  • Video upload handling                                │
│  • FFmpeg frame extraction                              │
│  • LLM API orchestration (Anthropic/OpenAI/Google)     │
│  • Database operations                                  │
│  • Report generation                                    │
│  • REST API / GraphQL                                   │
│  • User authentication                                  │
│  • Business logic                                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/gRPC API calls
                 ↓
┌─────────────────────────────────────────────────────────┐
│  Python Microservice (CV Processing)                   │
│  ───────────────────────────────────────────────────── │
│  • MediaPipe Pose detection                             │
│  • Motion analysis algorithms                           │
│  • Strike candidate detection                           │
│  • Pose landmark extraction                             │
│  • REST API endpoint (FastAPI)                          │
└─────────────────────────────────────────────────────────┘
```

### Why This Architecture?

✅ **Best of both worlds**: Node.js for app logic (your strength), Python for CV (best tools)
✅ **Scalable**: CV service scales independently of main application
✅ **Familiar**: 90% of codebase in Node.js/TypeScript
✅ **Simple**: Python CV service is ~200 lines of code
✅ **Maintainable**: Clear separation of concerns
✅ **Future-proof**: Can swap CV service without touching main app
✅ **Cost-effective**: MediaPipe is free and highly accurate

### Alternative Considered: Pure Node.js

**Pure Node.js with TensorFlow.js MoveNet:**
- ✅ Single codebase, single language
- ✅ Simpler deployment
- ⚠️ Pose detection slightly less accurate than MediaPipe
- ⚠️ Slower CV processing
- ⚠️ Higher memory usage

**Decision:** Use hybrid approach for superior MediaPipe accuracy

---

## Complete Data Flow

### End-to-End Pipeline

```
Video Upload (100MB MP4, 1-6 minutes)
    ↓ [2s]
FFmpeg Frame Extraction (540 frames @ 2fps)
    ↓ [1s]
MediaPipe Pose Detection (33 landmarks × 2 fighters × 540 frames)
    ↓ [1s]
Motion Analysis & Strike Candidate Detection (58 candidates)
    ↓ [12s - BOTTLENECK]
LLM Classification (3 frames × 58 candidates → 42 validated strikes)
    ↓ [2s]
Data Enrichment & Combination Detection (8 combinations)
    ↓ [3s]
LLM Report Generation (Natural language insights)
    ↓
Final Report + Raw Data

TOTAL TIME: ~21 seconds ✅
TOTAL COST: ~$1.35 per video ✅
```

---

## Detailed Stage Breakdown

### Stage 0: User Upload

**INPUT:** Raw video file

```
Format: MP4, MOV, WebM (client-side validation)
Duration: 1-6 minutes (enforced client-side)
Size: ~10-200 MB depending on quality
Metadata: Sport type, fighter info (optional)
```

**Architecture:**

```
User Browser → Signed Upload URL → Cloud Storage (S3/GCS)
                                          ↓
                                    Trigger Processing
                                    (Lambda/Cloud Function)
```

**Technical Decision:**
- Direct browser → S3 upload with presigned URL (bypass server)
- Reduces server bandwidth, faster uploads
- Triggers processing via S3 event notification

**Error Handling:**
- Client-side validation (format, duration, size)
- Server-side verification before processing
- Quarantine suspicious files

---

### Stage 1: Frame Extraction

**INPUT:** Video file URL (s3://bucket/video123.mp4)
**PROCESS:** FFmpeg frame extraction
**OUTPUT:** JPEG image files

**Technical Specification:**

```javascript
// Node.js implementation
const ffmpeg = require('fluent-ffmpeg');

ffmpeg('video.mp4')
  .fps(2)  // 2 frames per second
  .size('640x480')  // Resize for cost optimization
  .format('image2')
  .output('frames/frame_%04d.jpg')
  .outputOptions('-q:v', '5')  // JPEG quality (85%)
  .on('end', () => console.log('Extraction complete'))
  .run();
```

**Frame Sampling Strategy:**

| Option | Description | Frames (3-6 min) | Cost Impact | V1 Choice |
|--------|-------------|------------------|-------------|-----------|
| Fixed 2fps | 1 frame every 0.5s | 360-720 | Baseline | ✅ **YES** |
| Fixed 5fps | 1 frame every 0.2s | 900-1800 | 2.5x higher | No |
| Keyframes | Scene changes only | 72-288 | 60-80% reduction | Future |
| Adaptive | Variable rate | Variable | Complex | Future |

**Output Data Structure:**

```json
{
  "video_id": "vid_123",
  "frames": [
    {
      "frame_number": 1,
      "timestamp": "00:00.00",
      "file_path": "s3://bucket/frames/vid_123/frame_0001.jpg",
      "size_bytes": 45000
    }
  ],
  "total_frames": 540,
  "extraction_time_ms": 2300
}
```

**Performance:** 2-5 seconds for 3-6 min video

---

### Stage 2: Computer Vision - Pose Detection

**INPUT:** Frame images (640x480 JPEG)
**PROCESS:** MediaPipe Pose detection via Python microservice
**OUTPUT:** Skeletal landmark data + strike candidates

#### Python Microservice API

**FastAPI Service (cv_service.py):**

```python
from fastapi import FastAPI, File, UploadFile
import mediapipe as mp
import cv2
import numpy as np

app = FastAPI()
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5
)

@app.post("/detect-poses")
async def detect_poses(file: UploadFile = File(...)):
    # Read uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Process with MediaPipe
    results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    # Extract landmarks
    if results.pose_landmarks:
        landmarks = []
        for landmark in results.pose_landmarks.landmark:
            landmarks.append({
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility
            })
        return {"landmarks": landmarks}

    return {"landmarks": None}

# Run with: uvicorn cv_service:app --port 8001
```

**Node.js Client Call:**

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function detectPoses(imagePath: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  const response = await axios.post(
    'http://cv-service:8001/detect-poses',
    form,
    { headers: form.getHeaders() }
  );

  return response.data.landmarks;
}
```

#### MediaPipe Output

**For each frame, MediaPipe returns 33 body landmarks per person:**

```json
{
  "frame_number": 245,
  "timestamp": "00:02.05",
  "detected_people": [
    {
      "person_id": 0,
      "landmarks": {
        "nose": {"x": 0.52, "y": 0.15, "z": -0.05, "visibility": 0.98},
        "left_shoulder": {"x": 0.45, "y": 0.28, "z": 0.02, "visibility": 0.95},
        "right_shoulder": {"x": 0.59, "y": 0.28, "z": 0.01, "visibility": 0.96},
        "left_elbow": {"x": 0.38, "y": 0.42, "z": 0.05, "visibility": 0.87},
        "right_elbow": {"x": 0.71, "y": 0.38, "z": 0.08, "visibility": 0.92},
        "left_wrist": {"x": 0.32, "y": 0.55, "z": 0.12, "visibility": 0.78},
        "right_wrist": {"x": 0.85, "y": 0.33, "z": 0.15, "visibility": 0.89}
        // ... 26 more landmarks
      },
      "pose_confidence": 0.94
    },
    {
      "person_id": 1,
      "landmarks": { /* Fighter B */ }
    }
  ]
}
```

#### Motion Detection Algorithm

**Strike Candidate Detection:**

```python
def detect_strike_candidates(frame_t, frame_t_minus_1):
    """
    Compare consecutive frames to detect rapid limb extensions
    """
    candidates = []

    VELOCITY_THRESHOLD = 0.3  # normalized units
    ACCEL_THRESHOLD = 0.2

    for person in [0, 1]:  # Both fighters
        # Get wrist positions
        wrist_current = frame_t.landmarks[person]["right_wrist"]
        wrist_previous = frame_t_minus_1.landmarks[person]["right_wrist"]

        # Calculate velocity (Euclidean distance)
        velocity = math.sqrt(
            (wrist_current.x - wrist_previous.x)**2 +
            (wrist_current.y - wrist_previous.y)**2
        )

        # Check if extension motion (toward opponent)
        elbow = frame_t.landmarks[person]["right_elbow"]
        shoulder = frame_t.landmarks[person]["right_shoulder"]
        is_extension = is_extension_motion(wrist_current, elbow, shoulder)

        # Strike detection
        if velocity > VELOCITY_THRESHOLD and is_extension:
            candidates.append({
                "frame_number": frame_t.number,
                "timestamp": frame_t.timestamp,
                "thrower": person,
                "limb": "right_hand",
                "velocity": velocity,
                "confidence": min(velocity / VELOCITY_THRESHOLD, 1.0),
                "frame_sequence": [frame_t.number - 1, frame_t.number, frame_t.number + 1]
            })

    return candidates
```

**Output Data Structure:**

```json
{
  "video_id": "vid_123",
  "cv_analysis": {
    "total_frames_processed": 540,
    "processing_time_ms": 8700,
    "strike_candidates": [
      {
        "candidate_id": "cand_001",
        "frame_number": 245,
        "timestamp": "00:02.05",
        "thrower_id": 0,
        "limb": "right_hand",
        "velocity": 2.8,
        "confidence": 0.87,
        "frame_sequence": [244, 245, 246]
      }
      // ... 20-60 candidates typically
    ]
  }
}
```

**Performance:** 1-2 seconds for 540 frames

---

### Stage 3: LLM Strike Classification

**INPUT:** Strike candidates (3-frame sequences)
**PROCESS:** LLM vision API classification
**OUTPUT:** Structured strike event data

#### LLM API Integration

**Claude API Call (Node.js/TypeScript):**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function classifyStrike(candidate: StrikeCandidate) {
  // Load 3 frames
  const frames = [
    fs.readFileSync(`frames/frame_${candidate.frameNumber - 1}.jpg`),
    fs.readFileSync(`frames/frame_${candidate.frameNumber}.jpg`),
    fs.readFileSync(`frames/frame_${candidate.frameNumber + 1}.jpg`)
  ];

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: frames[0].toString('base64')
            }
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: frames[1].toString('base64')
            }
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: frames[2].toString('base64')
            }
          },
          {
            type: "text",
            text: `Analyze this 3-frame sequence from a boxing sparring match.

Our computer vision detected a potential strike from the fighter on the LEFT side.

FRAME 1: Before strike
FRAME 2: During strike (peak extension)
FRAME 3: After strike / impact

Return ONLY valid JSON (no markdown):

{
  "strike_detected": true or false,
  "strike_data": {
    "thrower_stance": "Orthodox" | "Southpaw",
    "strike_type": {
      "category": "Hand" | "Kick" | "Elbow" | "Knee",
      "technique": "Jab" | "Cross" | "Hook" | "Uppercut" | "Roundhouse" | "Front Kick",
      "modifier": "Lead" | "Rear" | "Switch" | "Spinning" | null
    },
    "target_zone": "Head" | "Body" | "Legs",
    "outcome": "Landed Clean" | "Partially Landed" | "Blocked" | "Slipped" | "Parried" | "Rolled" | "Missed" | "Countered",
    "confidence": 0.0 to 1.0
  },
  "reasoning": "Brief explanation"
}

If NO strike (false positive), return {"strike_detected": false}`
          }
        ]
      }
    ]
  });

  return JSON.parse(message.content[0].text);
}
```

#### Parallel Processing Strategy

**Process candidates concurrently (10-20 at a time):**

```typescript
async function classifyAllStrikes(candidates: StrikeCandidate[]) {
  const CONCURRENCY_LIMIT = 10;
  const results = [];

  // Process in batches
  for (let i = 0; i < candidates.length; i += CONCURRENCY_LIMIT) {
    const batch = candidates.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(candidate => classifyStrike(candidate))
    );
    results.push(...batchResults);
  }

  return results;
}
```

**Time Optimization:**
- Serial: 60 candidates × 2s = 120 seconds ❌
- Parallel (10 concurrent): 60 / 10 × 2s = 12 seconds ✅

#### Error Handling

```typescript
async function classifyStrikeWithRetry(
  candidate: StrikeCandidate,
  maxRetries: number = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await classifyStrike(candidate);
      return result;
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
      } else if (attempt === maxRetries - 1) {
        // Final attempt failed
        return { strike_detected: false, error: error.message };
      }
    }
  }
}
```

**Output Data Structure:**

```json
{
  "video_id": "vid_123",
  "llm_classification": {
    "total_candidates": 58,
    "classified_strikes": 42,
    "false_positives": 16,
    "failed_classifications": 0,
    "processing_time_ms": 15400,
    "api_calls_made": 58,
    "total_cost_usd": 1.32
  },
  "strikes": [
    {
      "strike_id": "str_001",
      "timestamp": "00:02.05",
      "frame_number": 245,
      "thrower_id": 0,
      "thrower_stance": "Orthodox",
      "strike_type": {
        "category": "Hand",
        "technique": "Jab",
        "modifier": "Lead"
      },
      "target_zone": "Head",
      "outcome": "Slipped",
      "confidence_cv": 0.87,
      "confidence_llm": 0.95,
      "confidence_combined": 0.83
    }
  ]
}
```

**Performance:** 12-15 seconds (parallel processing)

---

### Stage 4: Data Enrichment & Combination Detection

**INPUT:** Classified strikes
**PROCESS:** Temporal analysis, pattern detection
**OUTPUT:** Enriched data with combinations

#### Combination Detection

```typescript
function detectCombinations(strikes: Strike[]): Combination[] {
  const COMBO_WINDOW_SECONDS = 2.0;
  const combinations: Combination[] = [];

  const sortedStrikes = strikes.sort((a, b) => a.timestamp - b.timestamp);
  let currentCombo: Strike[] = [];

  for (const strike of sortedStrikes) {
    if (currentCombo.length === 0) {
      currentCombo.push(strike);
    } else {
      const timeDiff = strike.timestamp - currentCombo[currentCombo.length - 1].timestamp;
      const sameThrower = strike.thrower_id === currentCombo[0].thrower_id;

      if (timeDiff <= COMBO_WINDOW_SECONDS && sameThrower) {
        currentCombo.push(strike);
      } else {
        if (currentCombo.length >= 2) {
          combinations.push(createCombination(currentCombo));
        }
        currentCombo = [strike];
      }
    }
  }

  // Handle last combo
  if (currentCombo.length >= 2) {
    combinations.push(createCombination(currentCombo));
  }

  return combinations;
}

function createCombination(strikes: Strike[]): Combination {
  return {
    combination_id: generateId(),
    strike_ids: strikes.map(s => s.strike_id),
    total_strikes: strikes.length,
    thrower_id: strikes[0].thrower_id,
    start_time: strikes[0].timestamp,
    end_time: strikes[strikes.length - 1].timestamp,
    duration_seconds: strikes[strikes.length - 1].timestamp - strikes[0].timestamp,
    combo_type: classifyCombo(strikes), // "Jab-Cross", "Jab-Jab-Hook", etc.
    outcome: determineComboOutcome(strikes)
  };
}
```

#### Data Enrichment

```typescript
function enrichStrikeData(strikes: Strike[]): Strike[] {
  return strikes.map((strike, index) => ({
    ...strike,
    strike_number: index + 1,
    strikes_before: index,
    strikes_after: strikes.length - index - 1,
    time_since_last_strike: index > 0
      ? strike.timestamp - strikes[index - 1].timestamp
      : null,
    range: estimateRange(strike),
    initiated_from: classifyInitiation(strike, strikes.slice(0, index))
  }));
}
```

**Output:**

```json
{
  "session_data": {
    "total_strikes": 42,
    "total_combinations": 8,
    "fighters": [
      {
        "fighter_id": 0,
        "total_strikes_thrown": 24,
        "total_strikes_landed": 15,
        "accuracy": 0.625
      },
      {
        "fighter_id": 1,
        "total_strikes_thrown": 18,
        "total_strikes_landed": 11,
        "accuracy": 0.611
      }
    ]
  },
  "combinations": [
    {
      "combination_id": "combo_001",
      "combo_type": "Jab-Cross",
      "total_strikes": 2,
      "duration_seconds": 0.8
    }
  ]
}
```

**Performance:** 1-2 seconds

---

### Stage 5: LLM Report Generation

**INPUT:** Aggregated strike data
**PROCESS:** LLM text generation
**OUTPUT:** Natural language report

```typescript
async function generateReport(sessionData: SessionData) {
  const prompt = `You are an expert combat sports analyst. Generate a coaching report based on this sparring session data:

${JSON.stringify(sessionData, null, 2)}

Provide:
1. Executive Summary (2-3 sentences)
2. Fighter A Performance Analysis
3. Fighter B Performance Analysis
4. Key Patterns & Observations
5. Coaching Recommendations for each fighter

Use clear, actionable language. Format as markdown.`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }]
  });

  return message.content[0].text;
}
```

**Output:**

```json
{
  "report": {
    "generated_at": "2025-01-25T10:23:45Z",
    "format": "markdown",
    "content": "# Sparring Analysis Report\n\n## Executive Summary\n\n...",
    "sections": {
      "executive_summary": "...",
      "fighter_a_analysis": "...",
      "fighter_b_analysis": "...",
      "patterns": "...",
      "recommendations": "..."
    }
  }
}
```

**Performance:** 2-3 seconds

---

## Technology Stack

### Main Application (Node.js/TypeScript)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 20+ | Main application runtime |
| **Language** | TypeScript | Type safety, better DX |
| **Framework** | Express / Fastify | REST API server |
| **Video Processing** | fluent-ffmpeg | Frame extraction |
| **LLM Integration** | @anthropic-ai/sdk | Claude API |
| **Database** | PostgreSQL + Prisma | Structured data storage |
| **Storage** | AWS S3 / GCS | Video & frame storage |
| **Queue** | Bull / BullMQ | Job processing |
| **Auth** | Clerk / Auth0 | User authentication |

### CV Microservice (Python)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Python 3.9+ | CV processing |
| **Framework** | FastAPI | REST API server |
| **CV Library** | MediaPipe | Pose detection |
| **Image Processing** | OpenCV (cv2) | Image manipulation |
| **HTTP Server** | Uvicorn | ASGI server |
| **Container** | Docker | Deployment |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | Google Cloud Run / AWS Fargate | Serverless containers |
| **Storage** | S3 / Google Cloud Storage | Video/frame storage |
| **Database** | PostgreSQL (Cloud SQL) | Relational data |
| **CDN** | CloudFront / Cloud CDN | Fast asset delivery |
| **Monitoring** | Sentry / CloudWatch | Error tracking |

---

## Cost Analysis

### Per-Video Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| **MediaPipe Processing** | $0.00006 | Cloud Run compute (2s CPU) |
| **FFmpeg Extraction** | $0.00003 | Minimal compute |
| **LLM Classification** | $1.20-1.40 | 🔴 Main cost (Claude API) |
| **LLM Report Generation** | $0.05-0.10 | Text-only, cheap |
| **Database Storage** | $0.001 | PostgreSQL |
| **Video Storage (S3)** | $0.002 | ~100MB @ $0.023/GB |
| **Total** | **$1.25-1.50** | ✅ Within $1-2 budget |

### MediaPipe Infrastructure Cost

**MediaPipe is FREE (open-source). You only pay for infrastructure:**

#### Option A: Serverless (Recommended for V1)

**Google Cloud Run:**
```
CPU: 1 vCPU
Memory: 2 GB RAM

Pricing:
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GB-second

Cost per video (2s processing):
- CPU: 2s × $0.000024 = $0.000048
- Memory: 2s × 2GB × $0.0000025 = $0.00001
- TOTAL: $0.00006 per video (negligible!)

Monthly (20 videos/day):
- 600 videos × $0.00006 = $0.036/month
- Effectively FREE ✅
```

#### Option B: GPU-Accelerated (For Speed)

**Google Cloud Run with GPU:**
```
NVIDIA T4 GPU: ~$0.35/hour
Process: 200+ videos/hour
Cost per video: ~$0.0017

Benefit: 5-10x faster
Trade-off: Higher cost (still within budget)
```

#### Option C: Dedicated Server

**Digital Ocean / Linode:**
```
2 vCPU, 4GB RAM: ~$20-40/month
Unlimited processing (flat rate)
Cost per video: $0 (after fixed monthly cost)

Best for: 100+ videos/day (predictable volume)
```

### Cost at Scale

**Testing Phase (5-20 videos/day):**
```
Videos: 20/day × 30 days = 600 videos/month
- MediaPipe: $0.036
- LLM: 600 × $1.30 = $780
- Storage: $5
TOTAL: ~$785/month

MediaPipe = 0.005% of costs
```

**Growth (100 videos/day):**
```
Videos: 3,000/month
- MediaPipe: $1.80
- LLM: $3,900
TOTAL: ~$3,902/month

MediaPipe = 0.05% of costs
```

**Future Self-Hosted LLM:**
```
GPU Server: $500-1000/month (fixed)
MediaPipe: Runs on same server ($0 additional)
Cost per video: ~$0 (after infrastructure)
Break-even: 400-800 videos/month
```

### Cost Optimization Strategies

1. **Frame Sampling**: 2fps vs 5fps (60% cost reduction)
2. **Frame Resolution**: 480p vs 1080p (50% cost reduction)
3. **Batch Processing**: Claude Batch API (50% discount, 24hr latency)
4. **Parallel Processing**: Reduce processing time
5. **Confidence Thresholding**: Skip LLM for high-confidence CV detections

---

## Performance Targets

### V1 Targets

| Metric | Target | Acceptable | Current Estimate |
|--------|--------|------------|------------------|
| **Processing Time** | 5-10 min | 30 min | ~21 seconds ✅ |
| **Cost per Video** | <$1.50 | <$2.00 | $1.25-1.50 ✅ |
| **Accuracy** | >85% | >75% | TBD (testing) |
| **Uptime** | 99% | 95% | TBD |
| **Concurrent Users** | 10 | 5 | Scalable |

### Bottlenecks

| Stage | Time | Optimization |
|-------|------|--------------|
| Upload | Variable | Direct S3 upload |
| Frame Extraction | 2s | Acceptable |
| CV Processing | 1s | Parallelizable |
| **LLM Classification** | **12s** | **Already optimized (parallel)** |
| Data Enrichment | 2s | Acceptable |
| Report Generation | 3s | Acceptable |

**Primary Bottleneck:** LLM API calls (already mitigated with parallel processing)

---

## Technical Decisions

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Hybrid Node.js + Python | Best tools for each job |
| **CV Library** | MediaPipe | Best accuracy, free |
| **LLM Provider (Primary)** | Claude 3.5 Sonnet | Best cost/performance ratio |
| **LLM Provider (Backup)** | Gemini 1.5 Flash | 50% cheaper, good enough |
| **Frame Sampling** | 2fps fixed rate | Predictable costs, simple |
| **Frame Resolution** | 640x480 | Balance quality vs cost |
| **Database** | PostgreSQL | Structured data, relations |
| **Deployment** | Cloud Run / Fargate | Serverless, scalable |
| **Processing** | Asynchronous (queue) | Better UX, cost optimization |

### Decisions Pending

| Decision | Options | Testing Needed |
|----------|---------|----------------|
| **CV Confidence Threshold** | 80%? 90%? | Empirical testing |
| **Concurrency Limit** | 10? 20? | Rate limit testing |
| **Combination Time Window** | 1.5s? 2s? | Domain expert input |
| **Stance Detection** | Start only? Continuous? | Accuracy testing |

---

## Deployment Architecture

### Docker Compose (Local Development)

```yaml
version: '3.8'

services:
  app:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/fightsight
      - CV_SERVICE_URL=http://cv-service:8001
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db
      - cv-service

  cv-service:
    build: ./cv-service
    ports:
      - "8001:8001"

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=fightsight
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Cloud Deployment (Production)

```
┌──────────────────────────────────────────────────────┐
│  CloudFront / Cloud CDN (Static Assets)              │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│  Load Balancer                                       │
└──────────────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  App Service   │   │  CV Service     │
│  (Cloud Run)   │   │  (Cloud Run)    │
│  Node.js/TS    │───│  Python/FastAPI │
│  Auto-scale    │   │  Auto-scale     │
└───────┬────────┘   └─────────────────┘
        │
        ├─────────────┬─────────────┬─────────────┐
        │             │             │             │
┌───────▼────┐ ┌──────▼─────┐ ┌────▼─────┐ ┌─────▼────┐
│ PostgreSQL │ │  S3/GCS    │ │  Redis   │ │   LLM    │
│ (Cloud SQL)│ │  (Storage) │ │  (Cache) │ │   APIs   │
└────────────┘ └────────────┘ └──────────┘ └──────────┘
```

### CI/CD Pipeline

```
GitHub Push
    ↓
GitHub Actions
    ↓
Run Tests (Jest, Pytest)
    ↓
Build Docker Images
    ↓
Push to Container Registry
    ↓
Deploy to Cloud Run (staging)
    ↓
Run Integration Tests
    ↓
Deploy to Production (on approval)
```

---

## Next Steps

### Phase 1: Proof of Concept (Week 1-2)

- [ ] Set up project structure (Node.js + Python)
- [ ] Implement basic FFmpeg frame extraction
- [ ] Build Python CV microservice with MediaPipe
- [ ] Test MediaPipe on sample sparring videos
- [ ] Integrate Claude API for strike classification
- [ ] Test end-to-end with 3-5 sample videos
- [ ] Measure accuracy, cost, and processing time

### Phase 2: Core Pipeline (Week 2-3)

- [ ] Build complete data pipeline
- [ ] Implement parallel LLM processing
- [ ] Add combination detection logic
- [ ] Create database schema and models
- [ ] Build REST API endpoints
- [ ] Implement error handling and retries

### Phase 3: MVP Features (Week 3-4)

- [ ] Add LLM report generation
- [ ] Build simple web UI for upload
- [ ] Implement results display
- [ ] Add user authentication
- [ ] Deploy to staging environment
- [ ] Conduct user testing with real fighters/coaches

### Phase 4: Refinement (Week 4-6)

- [ ] Iterate on prompt engineering
- [ ] Optimize frame sampling based on results
- [ ] Improve accuracy through testing
- [ ] Add analytics and monitoring
- [ ] Polish UI/UX
- [ ] Launch limited beta

---

## Questions & Considerations

### Open Questions

1. **Stance Detection**: Static at start or continuous tracking?
2. **Fighter Identification**: Spatial position vs color detection?
3. **Velocity Thresholds**: What values detect strikes accurately?
4. **Video Quality**: Minimum acceptable resolution/lighting?
5. **Multi-Sport Support**: Build generic or boxing-first?

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM accuracy too low | High | Test multiple providers, fine-tuning option |
| MediaPipe fails to detect fighters | High | Fallback to manual labeling for V1 |
| Processing too slow | Medium | Add GPU acceleration option |
| Costs exceed budget | Medium | Implement cost controls, alerts |
| CV false positives | Low | LLM filtering handles this well |

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Author:** Mary (Business Analyst) + Brett
**Status:** Architecture Approved, Ready for Implementation
