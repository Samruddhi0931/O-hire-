# O(hire) — Developer Interview Prep Platform

**Live demo:** https://o-hire.vercel.app

> The API runs on a free hosting tier, so the very first request after a quiet period can take up to a minute while the server wakes up. After that it's fast.

A full-stack web application that solves the real problem of fragmented interview preparation. O(hire) combines spaced repetition flashcards, DSA topic tracking, company-wise question filtering, AI-powered flashcard generation, and mock interviews into a single personal prep OS.

## The Problem

As a developer preparing for technical interviews, study materials are scattered across Notion, browser bookmarks, and memory. There's no system that tracks what you know, surfaces what you're weak at, and tells you exactly what to study next for a specific company.

## Architecture

```
        React + TypeScript + TailwindCSS
                   (Vercel)
                      |
                      |  REST API (JWT auth)
                      |
         Node.js + Express (rate-limited)
                   (Render)
                      |
        ┌─────────────┼─────────────┐
        |             |             |
   PostgreSQL       Redis       OpenAI API
     (Neon)       (Upstash)    (flashcards +
   users,         question      mock interview
   flashcards,    cache,        feedback)
   progress       1hr TTL
```

## Key Engineering Decisions

### SM-2 Spaced Repetition Algorithm

Instead of showing cards randomly, O(hire) implements the SM-2 algorithm used in Anki. Each card review updates three parameters:

- **Ease factor** — how hard this card is for the user (min 1.3)
- **Interval** — days until next review
- **Repetitions** — streak of successful recalls

Cards the user struggles with (quality < 3) reset to day 1. Cards recalled easily get exponentially longer intervals. This surfaces weak spots automatically.

### Redis Caching for Company Questions

Company-tagged question sets are expensive to recompute and rarely change. Responses are cached in Redis with a 1-hour TTL using compound cache keys (e.g. `questions:Google:dsa:medium`). This eliminates redundant DB hits for the most common filter combinations.

Redis is an optimization, not a dependency: if the cache is unreachable, the API falls back to PostgreSQL and keeps serving requests, and the client is configured to fail fast instead of hanging.

### Weak Spot Detection

The dashboard query aggregates `AVG(ease_factor)` per topic to surface the 5 topics the user struggles with most. Low ease factor = high struggle. This turns raw review data into actionable study guidance.

### Company Readiness Report

The report endpoint uses PostgreSQL CTEs to join questions, progress, and flashcard data in a single query, avoiding N+1 queries by aggregating at the database level. Each report also saves a snapshot so readiness can be charted over time.

### Question Data Pipeline

An ETL script (`backend/src/db/etl.ts`) imports company-tagged questions from the open-source [liquidslr/interview-company-wise-problems](https://github.com/liquidslr/interview-company-wise-problems) dataset, merges duplicates across companies, and upserts them into PostgreSQL. The current database holds **2,800+ unique questions** across Google, Amazon, Microsoft, Apple, Uber, and Netflix.

## Features

- **Spaced repetition flashcards** with the SM-2 algorithm and a 6-point quality rating
- **DSA topic tracker** with status: learning / reviewed / confident
- **Company-wise question bank** filterable by company (Google, Amazon, Microsoft, Apple, Uber, Netflix), difficulty, and category
- **AI flashcard generation** — paste notes, get 5 cards in seconds via OpenAI
- **Weak spot dashboard** — shows topics with the lowest average ease factor
- **Mock Interview Mode** — timed coding sessions with AI feedback (time complexity, space complexity, edge cases, score), pulling problem statements from LeetCode
- **Interview Readiness Score** — weighted 0-100 score across retention, question completion, and topic confidence
- **Study Decay Warning** — detects inactivity and pulls overdue cards forward automatically
- **Study streaks** — tracks consecutive study days
- **Company Readiness Report** — single-page breakdown of your readiness for a specific company with focus areas and a score trend
- **JWT authentication** with 7-day token expiry

## Tech Stack

| Layer    | Tech                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | React, TypeScript, Vite, TailwindCSS                          |
| Backend  | Node.js, Express, TypeScript                                  |
| Database | PostgreSQL (Neon) with GIN-indexed arrays for company filtering |
| Cache    | Redis (Upstash) via ioredis                                   |
| Auth     | JWT with bcrypt password hashing (bcryptjs)                   |
| AI       | OpenAI GPT-3.5-turbo with JSON mode                           |
| Deploy   | Vercel (frontend), Render (API), Neon (Postgres), Upstash (Redis) |

## Local Setup

```bash
# Clone and install
git clone https://github.com/Samruddhi0931/O-hire-.git
cd O-hire-/backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, OPENAI_API_KEY

# Create the schema and load question data
cd ../backend
npm run migrate                              # core tables
npx ts-node src/db/migrate-additions.ts      # streaks, interview sessions, readiness snapshots
npx ts-node src/db/etl.ts                    # imports ~2,800 company-tagged questions

# Start both servers
npm run dev                                  # API on port 5000
cd ../frontend && npm run dev                # app on port 5173
```

The frontend reads the API address from `VITE_API_URL` and defaults to `http://localhost:5000/api` for local development.

## Deployment

| Piece    | Host    | Notes                                                                 |
| -------- | ------- | --------------------------------------------------------------------- |
| Frontend | Vercel  | Root directory `frontend`; set `VITE_API_URL` to `https://<api-host>/api` |
| API      | Render  | Root directory `backend`; build `npm install --include=dev && npm run build`; start `npm start`; health check `/health` |
| Database | Neon    | Managed PostgreSQL                                                    |
| Cache    | Upstash | Managed Redis; use the `rediss://` (TLS) connection URL                |

Backend environment variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OPENAI_API_KEY`.

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/dashboard/stats
POST   /api/dashboard/study-session   # Updates study streak

GET    /api/topics
POST   /api/topics
PATCH  /api/topics/:id/status

GET    /api/flashcards                # All cards, optionally by topic
GET    /api/flashcards/due            # Cards due for review today
POST   /api/flashcards                # Create a card manually
POST   /api/flashcards/:id/review     # Submit quality rating (0-5)
POST   /api/flashcards/generate       # AI generation from notes

GET    /api/questions                 # Filterable by company/category/difficulty
GET    /api/questions/my-progress     # Your progress across all questions
POST   /api/questions/:id/progress    # Mark solved/attempted

POST   /api/interview/start           # Begin a timed mock interview
POST   /api/interview/:sessionId/submit  # Submit code, get AI feedback
GET    /api/interview/history         # Past sessions with scores

GET    /api/report/:company           # Company readiness report
GET    /api/report/:company/trend     # Readiness score over time

GET    /health
```

## Database Schema

Key design decisions:

- `flashcards` stores SM-2 state (ease_factor, interval, repetitions, next_review) per card
- `questions.companies` is a PostgreSQL `TEXT[]` with a GIN index for efficient array membership queries (`$1 = ANY(companies)`)
- `user_question_progress` uses an upsert pattern to handle re-attempts cleanly
- `interview_sessions` stores each mock interview, with AI feedback as `JSONB`
- `readiness_snapshots` stores score history per user and company for trend charts
- `users` tracks `study_streak` and `last_studied_at` for streaks and decay warnings

## License

MIT
