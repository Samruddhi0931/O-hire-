import 'dotenv/config';
import pool from './index';

const migrations = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'learning',
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    ease_factor FLOAT DEFAULT 2.5,
    interval INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    difficulty VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    companies TEXT[] DEFAULT '{}',
    leetcode_id INTEGER,
    url VARCHAR(500),
    tags TEXT[] DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS user_question_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'unsolved',
    solved_at TIMESTAMP,
    UNIQUE(user_id, question_id)
  );

  CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(user_id, next_review);
  CREATE INDEX IF NOT EXISTS idx_questions_companies ON questions USING GIN(companies);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(migrations);
    console.log('Migrations ran successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
