import 'dotenv/config';

import pool from './index';

const additions = `
  -- Add last_studied_at to users for streak tracking
  ALTER TABLE users ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0;

  -- Store mock interview sessions
  CREATE TABLE IF NOT EXISTS interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    company VARCHAR(100),
    code_submitted TEXT,
    feedback JSONB,          -- { timeComplexity, spaceComplexity, edgeCases, suggestions, score }
    duration_seconds INTEGER,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
  );

  -- Store readiness score history (so we can chart progress over time)
  CREATE TABLE IF NOT EXISTS readiness_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(100),
    score INTEGER,
    retention_score INTEGER,   -- SM-2 component (0-100)
    completion_score INTEGER,  -- questions solved component (0-100)
    confidence_score INTEGER,  -- topic confidence component (0-100)
    captured_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON interview_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_user_company ON readiness_snapshots(user_id, company);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(additions);
    console.log('Addition migrations ran successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
