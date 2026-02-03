# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

## Project Overview

**XTRI SISU 2026** is a real-time monitoring system for Brazilian university entrance exam (SISU) cut-off scores. The project consists of:

1. **Frontend**: Next.js 14 web application (`web/`) - A simulator where students can compare their ENEM scores with course cut-off scores
2. **Backend**: Python-based data synchronization system (`src/`, `scripts/`, `execution/`) - Fetches data from MeuSISU API and syncs to Supabase
3. **Database**: Supabase (PostgreSQL) - Stores 8,500+ courses, weights, cut scores, and approved students from previous years

**Live URL**: https://xtrisisu.app

## The 3-Layer Architecture

This project follows a 3-layer architecture that separates concerns to maximize reliability:

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `directives/`
- Define goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Charts**: Recharts
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel (Root Directory: `web`)

### Backend (Python)
- **Language**: Python 3.9+ (Docker uses 3.11)
- **Key Dependencies**: 
  - `requests` - HTTP client for API calls
  - `pydantic` - Data validation
- **Build**: Hatchling (defined in `pyproject.toml`)
- **Code Quality**: Ruff (linting), MyPy (type checking)
- **Testing**: pytest

### Database (Supabase)
- **Platform**: Supabase (PostgreSQL)
- **Tables**:
  - `courses` - Course information (8,500+ records)
  - `course_weights` - ENEM component weights per course/year
  - `cut_scores` - Historical cut-off scores with partial daily scores
  - `approved_students` - Lists of approved students from previous years
- **Security**: Row Level Security (RLS) enabled, public read access, service_role write access

### External APIs
- **MeuSISU API**: `https://meusisu.com/api` - Source of truth for SISU data (returns Protobuf binary)
- **Supabase REST API**: Database operations

## Project Structure

```
sisu2025/
├── web/                          # Next.js frontend
│   ├── app/                      # App Router (Next.js 14)
│   │   ├── api/                  # API Routes (filters, courses, simulate)
│   │   ├── courses/[id]/         # Course detail pages
│   │   ├── page.tsx              # Main simulator page
│   │   └── layout.tsx            # Root layout with providers
│   ├── components/               # React components
│   │   ├── CourseDetail/         # Course detail components
│   │   ├── CourseCard.tsx
│   │   ├── ScoreDrawer.tsx
│   │   └── SearchFilters.tsx
│   ├── context/                  # React Context providers
│   │   ├── ScoreContext.tsx      # ENEM scores state
│   │   └── ModalityContext.tsx   # Modality selection state
│   ├── lib/supabase.ts           # Supabase server client
│   └── public/                   # Static assets
│
├── src/                          # Python source code
│   ├── decoder/                  # Protobuf decoder (core technology)
│   │   ├── protobuf.py           # Generic protobuf parser
│   │   └── course.py             # Course/student data structures
│   ├── monitor/                  # Monitoring system
│   │   ├── runner.py             # Main monitoring loop
│   │   ├── fetcher.py            # HTTP fetcher
│   │   └── tracker.py            # Change tracking
│   ├── notifications/            # Notification channels
│   │   ├── manager.py            # Notification orchestrator
│   │   ├── telegram.py           # Telegram bot
│   │   ├── webhook.py            # Discord/Slack webhooks
│   │   ├── desktop.py            # macOS notifications
│   │   └── sound.py              # Audio alerts
│   ├── storage/                  # Data persistence
│   │   ├── supabase_client.py    # Supabase REST client
│   │   ├── history.py            # Local file storage
│   │   └── database.py           # SQLite fallback
│   └── utils/                    # Utilities
│       ├── config.py             # Configuration loader
│       └── logging.py            # Logging setup
│
├── execution/                    # Deterministic execution scripts
│   ├── quick_sync.py             # Fast daily sync (use this most often)
│   ├── full_data_sync.py         # Complete sync (all years, slower)
│   ├── sync_cut_scores.py        # Detailed sync with logging
│   ├── auto_sync.py              # Scheduled continuous sync
│   ├── monitor_scores.py         # Real-time monitoring
│   └── night_watch.py            # Overnight monitoring
│
├── scripts/                      # Utility/debug scripts
│   ├── check_2026.py             # Verify 2026 data exists
│   ├── verify_data_structure.py  # Validate data integrity
│   ├── import_to_supabase.py     # Bulk import operations
│   └── test_notifications.py     # Test notification channels
│
├── tests/                        # Python test suite
│   ├── test_decoder.py           # Protobuf decoder tests
│   ├── test_models.py            # Model tests
│   ├── test_notifications.py     # Notification tests
│   └── conftest.py               # pytest fixtures
│
├── directives/                   # SOPs and instructions
│   ├── sync_cut_scores.md        # How to sync cut scores
│   ├── debug_data_issues.md      # Troubleshooting guide
│   └── deploy_to_production.md   # Deployment checklist
│
├── config/                       # Configuration files
│   ├── settings.json             # App settings (intervals, API URLs)
│   ├── courses.json              # Courses to monitor
│   └── notifications.json        # Notification settings
│
├── supabase/                     # Database migrations
│   └── migrations/               # SQL migration files
│
├── data/                         # Local data storage (gitignored)
├── logs/                         # Log files (gitignored)
└── .tmp/                         # Temporary files (gitignored)
```

## Build and Run Commands

### Frontend (Next.js)
```bash
cd web
npm install
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
```

### Python Backend
```bash
# Install dependencies
pip install -e .

# Or with dev dependencies
pip install -e ".[dev]"

# Run main monitor
python main.py
python main.py --once      # Single iteration
python main.py --debug     # Debug mode
python main.py --test      # Test notifications

# Using Makefile
make install      # Install dependencies
make dev          # Install with dev dependencies
make run          # Run monitor
make run-once     # Single iteration
make run-debug    # Debug mode
```

### Data Synchronization
```bash
# Quick sync (recommended for daily use)
python execution/quick_sync.py

# Full sync (complete data refresh - slower)
python execution/full_data_sync.py

# Verify data
python scripts/check_2026.py
```

### Testing
```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html

# Using Makefile
make test
make test-cov
```

### Code Quality
```bash
# Linting
ruff check src/

# Type checking
mypy src/

# Formatting
ruff format src/

# Using Makefile
make lint
make format
```

### Docker
```bash
# Build image
docker build -t sisu-monitor:latest .

# Run container
docker run -it --rm \
  -v $(PWD)/config:/app/config \
  -v $(PWD)/data:/app/data \
  -v $(PWD)/logs:/app/logs \
  sisu-monitor:latest

# Using Makefile
make docker-build
make docker-run
```

## Code Style Guidelines

### Python
- **Line length**: 100 characters (configured in `pyproject.toml`)
- **Target Python version**: 3.10+
- **Type hints**: Required for all function signatures (`disallow_untyped_defs = true` in MyPy)
- **Import style**: Use `from __future__ import annotations` for forward references
- **Docstrings**: Google-style docstrings for modules, classes, and functions

### TypeScript/React
- **Strict mode**: Enabled
- **Components**: Functional components with explicit return types
- **State management**: React Context for global state (Scores, Modality)
- **Styling**: CSS Modules with camelCase class names

## Testing Strategy

### Python Tests
- **Framework**: pytest
- **Location**: `tests/` directory
- **Fixtures**: Defined in `conftest.py`
- **Coverage**: Use `pytest-cov` for coverage reports

### Key Test Areas
1. **Decoder tests** (`test_decoder.py`): Protobuf parsing, varint reading, course data extraction
2. **Model tests** (`test_models.py`): Data validation and serialization
3. **Notification tests** (`test_notifications.py`): Notification channel testing

## Key Technical Details

### Protobuf Decoding
The MeuSISU API returns binary Protobuf data. The project includes a custom Protobuf decoder (`src/decoder/protobuf.py`) that parses this without requiring `.proto` schema files.

Key decoder files:
- `src/decoder/protobuf.py` - Generic Protobuf parser
- `src/decoder/course.py` - Course and student data structures

### Data Flow
```
MeuSISU API (Protobuf)
    ↓
src/decoder/course.py → decode_course()
    ↓
execution/quick_sync.py (or full_data_sync.py)
    ↓
Supabase (courses, course_weights, cut_scores tables)
    ↓
web/ (Next.js frontend via API routes)
```

### Critical Configuration
- **Supabase URL**: `https://sisymqzxvuktdcbsbpbp.supabase.co`
- **MeuSISU API**: `https://meusisu.com/api`
- **Critical sync hours**: 00:00 - 08:00 (more frequent polling during SISU period)

### Environment Variables
Create `.env` file with:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
TELEGRAM_BOT_TOKEN=optional
TELEGRAM_CHAT_ID=optional
WEBHOOK_URL=optional
```

## Security Considerations

1. **Service Keys**: `SUPABASE_SERVICE_KEY` has full database access - never expose in frontend
2. **API Keys**: MeuSISU API doesn't require authentication but has rate limits
3. **RLS Policies**: Supabase tables have Row Level Security enabled
   - Public: SELECT only
   - service_role: Full access (INSERT, UPDATE, DELETE)

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to.

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**
- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs that the user can access
- **Intermediates**: Temporary files needed during processing

**Directory structure:**
- `.tmp/` - All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
- `execution/` - Python scripts (the deterministic tools)
- `directives/` - SOPs in Markdown (the instruction set)
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - Google OAuth credentials (required files, in `.gitignore`)

**Key principle:** Local files are only for processing. Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.
