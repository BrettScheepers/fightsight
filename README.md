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

3. **Add your API keys to `.env`**

   ```bash
   # Edit .env and add:
   ANTHROPIC_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here  # optional
   GOOGLE_API_KEY=your_key_here  # optional
   ```

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

Target: **<$1-2 per video**

- MediaPipe pose detection: **Free** (open-source)
- Claude 3.5 Sonnet: ~$1.30 per 4-minute video
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

Required for MVP:

- `ANTHROPIC_API_KEY` - Primary LLM provider
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

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
