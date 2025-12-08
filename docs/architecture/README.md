# FightSight Architecture Documentation

**Project**: FightSight - Combat Sport Sparring Video Analysis
**Architecture Version**: 1.0
**Last Updated**: 2025-11-15

---

## Architecture Documents

### Core Architecture

1. **[Analysis Engine Architecture](../analysis-engine-architecture.md)**
   - Complete system design for video analysis pipeline
   - Hybrid Node.js + Python microservices approach
   - CV processing with MediaPipe
   - LLM integration for strike classification
   - Cost analysis and performance targets
   - **Status**: ✅ Approved, Ready for Implementation

2. **[Video Upload Flow](./video-upload-flow.md)** 🆕
   - Complete upload architecture specification
   - Storage abstraction layer design
   - API endpoint specifications
   - Frontend component architecture
   - Local storage (dev) → Cloud storage (prod) migration path
   - **Status**: ✅ Complete, Ready for Implementation

### Implementation Planning

3. **[Project Structure](../project-structure.md)**
   - Monorepo organization
   - Service responsibilities
   - Directory structure
   - Development workflow
   - **Status**: ✅ Complete

4. **[Database Schema](../database-schema.md)**
   - Entity relationship design
   - Prisma schema definitions
   - Data flow between tables
   - **Status**: ✅ Complete

5. **[Database ERD](../database-erd.md)**
   - Visual entity relationships
   - Table structures
   - Foreign key relationships
   - **Status**: ✅ Complete

### Discovery & Planning

6. **[Brainstorming Session Results](../brainstorming-session-results.md)**
   - Initial feature discovery
   - Tool landscape exploration
   - LLM strategy decisions
   - User requirements analysis
   - **Status**: ✅ Complete

---

## Implementation Status

### ✅ Completed (Architecture Phase)

- [x] System architecture design
- [x] Technology stack selection
- [x] Database schema design
- [x] Video upload flow specification
- [x] Storage abstraction layer (coded)
- [x] Cost analysis and optimization strategy
- [x] Deployment architecture planning

### ⏳ Ready for Implementation (Developer Phase)

- [ ] Storage API endpoints
- [ ] Video analysis endpoints
- [ ] Frontend upload UI
- [ ] CV Service (MediaPipe integration)
- [ ] LLM integration service
- [ ] Analysis pipeline worker
- [ ] Report generation

### 🔮 Future Enhancements

- [ ] Cloud storage migration (GCS)
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard
- [ ] Multi-sport support
- [ ] Self-hosted LLM option

---

## Key Architectural Decisions

### 1. Hybrid Microservices Architecture

**Decision**: Node.js main app + Python CV service

**Rationale**:
- Node.js for API, business logic, LLM orchestration (your strength)
- Python for computer vision (MediaPipe, best tooling)
- Clean separation of concerns
- Independently scalable services

### 2. Storage Abstraction Pattern

**Decision**: Interface-based storage with swappable backends

**Rationale**:
- Start with local filesystem (zero cost, fast development)
- Migrate to Google Cloud Storage later (when ready)
- No application code changes when switching storage
- Easy to test with local, deploy with cloud

### 3. Cost-First Design

**Decision**: Target <$1.50 per video analysis

**Rationale**:
- Frame sampling at 2fps (not 5fps or 10fps)
- Parallel LLM processing (10 concurrent)
- MediaPipe is free (only pay for infrastructure)
- Batch processing when possible

### 4. Client-Side Video Clipping

**Decision**: Users trim videos to 1-6 minutes before upload

**Rationale**:
- Prevents processing of 30-60 minute full sessions
- Keeps costs predictable
- Reduces storage requirements
- Simplifies analysis scope

### 5. LLM Provider Abstraction

**Decision**: Model-agnostic interface for LLMs

**Rationale**:
- Can switch between Claude, GPT-4, Gemini
- Test different models for cost/accuracy
- Migrate to self-hosted models later
- A/B testing capability

---

## Technology Stack Summary

### Backend Services

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Main API** | Node.js + TypeScript + Express | Business logic, orchestration |
| **CV Service** | Python + FastAPI + MediaPipe | Pose detection, motion analysis |
| **Database** | PostgreSQL + Prisma | Data persistence |
| **Job Queue** | Redis + Bull | Background processing |
| **Storage** | Local FS → GCS | Video/frame storage |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 14 + React 18 | Web application |
| **Styling** | TailwindCSS + Shadcn/ui | UI components |
| **State** | React hooks | Client state |
| **API Client** | Axios | HTTP requests |

### AI/ML

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Pose Detection** | MediaPipe Pose | Skeletal tracking |
| **Strike Classification** | Claude 3.5 Sonnet | Vision-based classification |
| **Report Generation** | Claude 3.5 Sonnet | Natural language insights |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Containerization** | Docker + Docker Compose | Service orchestration |
| **Deployment** | Cloud Run / Fargate | Serverless containers |
| **Monitoring** | Sentry / CloudWatch | Error tracking |

---

## Data Flow Overview

```
User Uploads Video (Web UI)
    ↓
Video Stored (Local FS / GCS)
    ↓
Job Created (Redis Queue)
    ↓
Worker Picks Up Job
    ↓
Frame Extraction (FFmpeg → 2fps → 640x480)
    ↓
CV Processing (MediaPipe Pose Detection)
    ↓
Motion Analysis (Strike Candidate Detection)
    ↓
LLM Classification (Claude Vision API, parallel)
    ↓
Data Enrichment (Combination Detection)
    ↓
Report Generation (Claude Text API)
    ↓
Store Results (PostgreSQL)
    ↓
Notify User (WebSocket / Polling)
    ↓
Display Analysis (Web UI)
```

**Processing Time**: ~20-30 seconds per video
**Cost**: ~$1.25-1.50 per video

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2) ✅ CURRENT

- [x] Project structure setup
- [x] Docker configuration
- [x] Database schema design
- [x] Architecture documentation
- [ ] Storage implementation
- [ ] Upload flow implementation

### Phase 2: Core Pipeline (Weeks 2-4)

- [ ] CV Service (MediaPipe integration)
- [ ] Frame extraction service
- [ ] LLM integration (Claude API)
- [ ] Analysis pipeline worker
- [ ] Job queue implementation

### Phase 3: Analysis Features (Weeks 4-6)

- [ ] Strike classification refinement
- [ ] Combination detection
- [ ] Data enrichment
- [ ] Report generation
- [ ] Results API

### Phase 4: User Interface (Weeks 6-8)

- [ ] Upload UI (in progress)
- [ ] Analysis results display
- [ ] Video playback with annotations
- [ ] Dashboard/analytics
- [ ] User authentication

### Phase 5: Refinement (Weeks 8-10)

- [ ] Prompt engineering optimization
- [ ] Accuracy testing and tuning
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User testing

---

## Cost Targets & Performance

### Per-Video Costs (Target)

| Component | Cost | % of Total |
|-----------|------|-----------|
| LLM Classification | $1.20-1.40 | 90% |
| LLM Report Generation | $0.05-0.10 | 5% |
| Storage (GCS) | $0.002 | <1% |
| CV Processing (Cloud Run) | $0.00006 | <1% |
| Database | $0.001 | <1% |
| **Total** | **$1.25-1.50** | **100%** |

### Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Processing Time | 20-30 sec | < 5 min |
| Accuracy | >90% | >80% |
| Uptime | 99.5% | 99% |
| Cost per Video | <$1.50 | <$2.00 |

---

## Security & Privacy

### Upload Security

- Token-based upload authorization (15 min expiry)
- File type validation (client + server)
- File size limits (500 MB max)
- Sanitized filenames (prevent path traversal)
- User ownership verification

### Data Security

- Private video storage (no public access)
- JWT-based API authentication
- HTTPS only in production
- Secure credential management

### Future Enhancements

- Video encryption at rest
- Signed download URLs (short expiry)
- Rate limiting (10 uploads/hour)
- Virus scanning
- Audit logging

---

## Migration Paths

### Storage: Local → Google Cloud Storage

**When**: Ready to deploy or exceed local capacity

**Steps**:
1. Create GCS bucket and service account
2. Install `@google-cloud/storage` package
3. Implement `GCSStorage` class
4. Update environment: `STORAGE_TYPE=gcs`
5. **No application code changes required!**

**Documentation**: See `docs/gcs-setup-guide.md` (to be created when needed)

### LLM: Cloud API → Self-Hosted

**When**: Volume exceeds 400-800 videos/month (cost break-even)

**Options**:
- LLaVA (open-source vision model)
- LLaMA + CLIP (vision + language)
- Fine-tuned strike classification model

**Infrastructure**: GPU server ($500-1000/month fixed cost)

---

## Testing Strategy

### Unit Tests

- Storage service methods
- LLM integration (mocked)
- Data enrichment logic
- Filename sanitization

### Integration Tests

- Complete upload flow
- CV → LLM → Database pipeline
- Job queue processing
- API endpoint validation

### End-to-End Tests

- User uploads video → receives analysis
- Error handling (large files, invalid formats)
- Token expiration handling
- Multi-user concurrent uploads

---

## Monitoring & Observability

### Key Metrics

- Upload success rate
- Processing time per video
- LLM API costs
- Error rates by type
- Queue depth
- Storage utilization

### Logging

- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Request IDs for tracing
- Error stack traces

### Alerting

- Processing failures
- High error rates
- Cost anomalies
- Queue backlog
- Storage capacity

---

## Developer Handoff

### For Implementation

**Read First**:
1. [Video Upload Flow](./video-upload-flow.md) - Complete architecture
2. [Handoff Document](../HANDOFF-video-upload-implementation.md) - Implementation guide

**Start Here**:
1. Fix TypeScript errors (`@types/node`)
2. Implement storage endpoints
3. Build upload UI
4. Test end-to-end flow

**Estimated Time**: 4-6 hours for upload flow

---

## Document Maintenance

### How to Update

When making architectural changes:

1. Update relevant architecture doc
2. Update this README if needed
3. Update implementation handoff if affected
4. Increment version number
5. Update "Last Updated" date

### Document Owners

- **Architecture**: Winston (Architect)
- **Implementation**: Developer Team
- **Product**: Mary (Business Analyst)

---

## Quick Links

### Documentation

- [Analysis Engine Architecture](../analysis-engine-architecture.md)
- [Video Upload Flow](./video-upload-flow.md)
- [Project Structure](../project-structure.md)
- [Database Schema](../database-schema.md)
- [Handoff Document](../HANDOFF-video-upload-implementation.md)

### External Resources

- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Architecture Status**: ✅ Complete and Ready for Implementation

**Next Step**: Activate Developer agent to begin implementation

---

*Maintained by Winston (Architect) 🏗️*
*Last Updated: 2025-11-15*
