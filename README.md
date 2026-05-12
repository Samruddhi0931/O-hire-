# O(hire) — Developer Interview Prep Platform

A full-stack web application that solves the real problem of fragmented interview preparation. O(hire) combines spaced repetition flashcards, DSA topic tracking, company-wise question filtering, and AI-powered card generation into a single personal prep OS.

## The Problem

As a developer preparing for technical interviews, study materials are scattered across Notion, browser bookmarks, and memory. There's no system that tracks what you know, surfaces what you're weak at, and tells you exactly what to study next for a specific company.

## Architecture

```
React + TypeScript + TailwindCSS
          |
          | REST API (JWT auth)
          |
Node.js + Express (rate-limited)
          |
    ┌─────┴─────┐
PostgreSQL    Redis
(users,       (company question
 flashcards,   cache — 1hr TTL)
 progress)
          |
      OpenAI API
  (flashcard generation)
```

## Key Engineering Decisions

### SM-2 Spaced Repetition Algorithm
Instead of showing cards randomly, O(hire) implements the SM-2 algorithm used in Anki. Each card review updates three parameters:
- **Ease factor** — how hard this card is for the user (min 1.3)
- **Interval** — days until next review
- **Repetitions** — streak of successful recalls

Cards the user struggles with (quality < 3) reset to day 1. Cards recalled easily get exponentially longer intervals. This surfaces weak spots automatically.

### Redis Caching for Company Questions
Company-tagged question sets are expensive to recompute and rarely change. Responses are cached in Redis with a 1-hour TTL using compound cache keys (`questions:google:dsa:medium`). This eliminates redundant DB hits for the most common filter combinations.

### Weak Spot Detection
The dashboard query aggregates `AVG(ease_factor)` per topic to surface the 5 topics the user struggles with most. Low ease factor = high struggle. This turns raw review data into actionable study guidance.

## Features

- **Spaced repetition flashcards** with SM-2 algorithm and 6-point quality rating
- **DSA topic tracker** with status: learning / reviewed / confident
- **Company-wise question bank** filterable by company (Google, Meta, Amazon), difficulty, and category
- **AI flashcard generation** — paste notes, get 5 cards in seconds via OpenAI
- **Weak spot dashboard** — shows topics with lowest average ease factor
- **Mock Interview Mode** — timed coding sessions with AI feedback (time complexity, edge cases, score)
- **Interview Readiness Score** — weighted 0-100 score across retention, question completion, and topic confidence
- **Study Decay Warning** — detects inactivity and pulls overdue cards forward automatically
- **Company Readiness Report** — single-page breakdown of your readiness for a specific company with focus areas
- **JWT authentication** with 7-day token expiry

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, TailwindCSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with indexed GIN arrays for company filtering |
| Cache | Redis (ioredis) |
| Auth | JWT (bcrypt password hashing) |
| AI | OpenAI GPT-3.5-turbo with JSON mode |
| Deploy | Railway |

## Local Setup

```bash
# Clone and install
git clone https://github.com/yourusername/O(hire)
cd O(hire)/backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, OPENAI_API_KEY

# Run migrations
cd backend && npm run migrate

# Start both servers
cd backend && npm run dev   # port 5000
cd frontend && npm run dev  # port 5173
```

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/dashboard/stats
GET    /api/topics
POST   /api/topics
PATCH  /api/topics/:id/status
GET    /api/flashcards/due          # Cards due for review today
POST   /api/flashcards/:id/review   # Submit quality rating (0-5)
POST   /api/flashcards/generate     # AI generation from notes
GET    /api/questions               # Filterable by company/category/difficulty
POST   /api/questions/:id/progress  # Mark solved/attempted
GET    /health
```

## Database Schema

Key design decisions:
- `flashcards` table stores SM-2 state (ease_factor, interval, repetitions, next_review) per card
- `questions.companies` is a PostgreSQL TEXT[] with a GIN index for efficient array membership queries (`$1 = ANY(companies)`)
- `user_question_progress` uses an upsert pattern to handle re-attempts cleanly
