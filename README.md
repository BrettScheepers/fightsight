# FightSight 🥊

AI-powered combat sport sparring video analysis platform that provides detailed strike-by-strike breakdowns using hybrid Computer Vision and Large Language Model architecture.

## Architecture Overview

- **Frontend**: Next.js 14 (React, TypeScript)
- **API**: Node.js (Express/Fastify, TypeScript)
- **CV Service**: Python (FastAPI, MediaPipe)
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7
- **LLM Providers**: Anthropic Claude, OpenAI GPT-4V, Google Gemini

## Project Structure

```
fightsight/
├── services/
│   ├── api/              # Node.js main API server
│   ├── cv-service/       # Python computer vision microservice
│   └── web/              # Next.js frontend
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   └── config/           # Shared configuration
├── infrastructure/       # Docker & service configs
├── docs/                 # Architecture & planning docs
└── scripts/              # Setup & utility scripts
```

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine + Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local CV service development)
- Git

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/fightsight.git
   cd fightsight
   ```

2. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

3. **Configure LLM Provider**

   **Option 1: Use Mock (No API Key Required)**
   ```bash
   # .env is already set to mock by default
   LLM_PROVIDER=mock
   ```

   **Option 2: Use Gemini Free Tier (Recommended)**
   ```bash
   # Get free API key from: https://aistudio.google.com/app/apikey
   # Update .env:
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   Free tier includes:
   - 15 requests/minute
   - 1,500 requests/day
   - Perfect for testing and small videos

4. **Run setup script**

   ```bash
   npm run setup
   ```

5. **Start all services**
   ```bash
   npm run dev
   ```

### Development Mode

Start all services with hot-reload:

```bash
npm run dev
```

Build and start fresh:

```bash
npm run dev:build
```

### Access Points

- **Web UI**: http://localhost:3001
- **API**: http://localhost:3000
- **CV Service**: http://localhost:8001
- **Redis Commander**: http://localhost:8081

### Individual Service Commands

```bash
# View all logs
npm run logs

# View specific service logs
npm run logs:api
npm run logs:cv
npm run logs:web
npm run logs:worker

# Stop all services
npm run stop

# Clean up (removes volumes)
npm run clean
```

## Development Workflow

### Working on the API (Node.js)

```bash
cd services/api
npm install
npm run dev  # Runs outside Docker for faster iteration
```

### Working on the CV Service (Python)

```bash
cd services/cv-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Working on the Frontend

```bash
cd services/web
npm install
npm run dev
```

### Running Tests

```bash
# All tests across all services
npm run test

# Individual service tests
cd services/api && npm test
cd services/cv-service && pytest
cd services/web && npm test
```

## Database Management

### Run Migrations

```bash
npm run db:migrate
```

### Seed Development Data

```bash
npm run db:seed
```

### Access PostgreSQL

Via PgAdmin/Datagrip at http://localhost:5050 or directly:

```bash
docker exec -it fightsight-postgres psql -U fightsight -d fightsight
```

## Cost Optimization

**Free Tier Option (Gemini 1.5 Flash)**
- 1,500 free requests/day
- ~$0 for videos up to 12 minutes (at 2fps sampling)
- Perfect for personal use and testing

**Paid Option (Future)**
- Target: <$1-2 per video
- Frame sampling at 2fps reduces LLM calls
- Parallel processing (10 concurrent) for speed

## Key Features (V1 MVP)

- ✅ Video upload (1-6 minute clips)
- ✅ Automated strike detection
- ✅ Strike classification (Level 3 granularity)
- ✅ Target zone identification (Head/Body/Legs)
- ✅ Outcome analysis (8 outcomes: landed, blocked, slipped, etc.)
- ✅ Combination detection
- ✅ Comprehensive analysis reports
- ✅ Fighter stance tracking

## Documentation

- [Brainstorming Session Results](./docs/brainstorming-session-results.md)
- [Analysis Engine Architecture](./docs/analysis-engine-architecture.md)
- Architecture Docs: `./docs/architecture/` (coming soon)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm run test`
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## Tech Stack Details

### Frontend Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Shadcn/ui components

### Backend Stack

- Node.js 18+
- Express or Fastify
- TypeScript
- Prisma ORM
- Bull Queue (Redis-based)

### CV Service Stack

- Python 3.11+
- FastAPI
- MediaPipe
- OpenCV
- NumPy

### Infrastructure

- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- Nginx (production)

## Environment Variables

See `.env.example` for all configuration options.

**For Testing (Mock Mode)**
- No API keys required
- Set `LLM_PROVIDER=mock` in `.env`

**For Real Analysis (Gemini Free Tier)**
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/app/apikey
- `DATABASE_URL` - PostgreSQL connection (auto-configured in Docker)
- `REDIS_URL` - Redis connection (auto-configured in Docker)

## Roadmap

### Phase 1 (Current - MVP)

- [x] Project structure & infrastructure
- [ ] Video upload & storage
- [ ] CV service integration
- [ ] LLM classification pipeline
- [ ] Basic analysis reports
- [ ] Strike event database

### Phase 2 (Future)

- [ ] Advanced metrics (velocity, force)
- [ ] Self-hosted LLM option
- [ ] Multi-sport support
- [ ] Pattern recognition
- [ ] AI coaching recommendations

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with**: Node.js, Python, MediaPipe, Claude AI, PostgreSQL, Redis, Docker
