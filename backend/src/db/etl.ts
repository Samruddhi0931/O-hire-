/**
 * PrepOS — Updated ETL Script
 *
 * Source: github.com/liquidslr/interview-company-wise-problems
 * Format: Separate CSV per company, columns: Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
 * Updated as of June 2025
 *
 * Run: npx ts-node src/db/etl.ts
 */

import 'dotenv/config';
import pool from './index';
import https from 'https';

// ─── CONFIG ────────────────────────────────────────────────────────────────

const TARGET_COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Apple', 'Uber', 'Netflix'];

const BASE_URL = 'https://raw.githubusercontent.com/liquidslr/interview-company-wise-problems/main';

// Use "5. All.csv" for all-time questions per company
const CSV_FILE = '5. All.csv';

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface Question {
  title: string;
  slug: string;
  difficulty: string;
  category: string;
  companies: string[];
  tags: string[];
  url: string;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function slugFromUrl(url: string): string {
  const match = url.match(/\/problems\/([^/]+)/);
  return match ? match[1] : '';
}

// ─── PARSE CSV ─────────────────────────────────────────────────────────────

function parseCompanyCSV(raw: string, company: string): Question[] {
  const lines = raw.trim().split('\n');
  const questions: Question[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Format: Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
    // Topics may contain commas inside quotes — handle carefully
    const match = line.match(/^([^,]+),([^,]+),[^,]+,[^,]+,([^,]+),"?([^"]*)"?$/);
    if (!match) {
      // Try simpler split for rows without quoted topics
      const parts = line.split(',');
      if (parts.length < 5) continue;

      const difficulty = parts[0].trim().toLowerCase();
      const title = parts[1].trim();
      const url = parts[4].trim();
      const slug = slugFromUrl(url);
      if (!slug || !title) continue;

      questions.push({
        title,
        slug,
        difficulty,
        category: 'dsa',
        companies: [company],
        tags: [],
        url,
      });
      continue;
    }

    const difficulty = match[1].trim().toLowerCase();
    const title = match[2].trim();
    const url = match[3].trim();
    const topicsRaw = match[4].trim();
    const slug = slugFromUrl(url);

    if (!slug || !title) continue;

    // Parse tags: "Array, Hash Table" → ['array', 'hash-table']
    const tags = topicsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean);

    questions.push({
      title,
      slug,
      difficulty,
      category: 'dsa',
      companies: [company],
      tags,
      url,
    });
  }

  return questions;
}

// ─── MERGE QUESTIONS ───────────────────────────────────────────────────────

function mergeQuestions(allQuestions: Question[]): Map<string, Question> {
  const map = new Map<string, Question>();

  for (const q of allQuestions) {
    if (map.has(q.slug)) {
      const existing = map.get(q.slug)!;
      // Merge companies
      for (const c of q.companies) {
        if (!existing.companies.includes(c)) {
          existing.companies.push(c);
        }
      }
      // Merge tags
      for (const t of q.tags) {
        if (!existing.tags.includes(t)) {
          existing.tags.push(t);
        }
      }
    } else {
      map.set(q.slug, { ...q });
    }
  }

  return map;
}

// ─── UPSERT INTO POSTGRES ──────────────────────────────────────────────────

async function ensureUniqueConstraint(client: any): Promise<void> {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questions_title_unique'
      ) THEN
        ALTER TABLE questions ADD CONSTRAINT questions_title_unique UNIQUE (title);
      END IF;
    END $$;
  `);
}

async function upsertQuestion(client: any, question: Question): Promise<void> {
  await client.query(
    `INSERT INTO questions (title, difficulty, category, companies, tags, url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (title) DO UPDATE SET
       difficulty = EXCLUDED.difficulty,
       companies  = EXCLUDED.companies,
       tags       = EXCLUDED.tags,
       url        = EXCLUDED.url`,
    [
      question.title,
      question.difficulty,
      question.category,
      question.companies,
      question.tags,
      question.url,
    ]
  );
}

// ─── MAIN ETL ──────────────────────────────────────────────────────────────

async function main() {
  console.log('PrepOS ETL — importing from liquidslr/interview-company-wise-problems\n');

  const allQuestions: Question[] = [];

  // Download CSV for each company
  for (const company of TARGET_COMPANIES) {
    const url = `${BASE_URL}/${encodeURIComponent(company)}/${encodeURIComponent(CSV_FILE)}`;
    process.stdout.write(`Downloading ${company}...`);

    try {
      const raw = await httpsGet(url);
      const questions = parseCompanyCSV(raw, company);
      allQuestions.push(...questions);
      console.log(` ${questions.length} questions`);
    } catch (err: any) {
      console.log(` SKIPPED (${err.message})`);
    }
  }

  console.log(`\nTotal rows collected: ${allQuestions.length}`);

  // Merge duplicates across companies
  const merged = mergeQuestions(allQuestions);
  console.log(`Unique questions after merge: ${merged.size}\n`);

  // Upsert into PostgreSQL
  console.log('Inserting into PostgreSQL...');
  const client = await pool.connect();

  try {
    await ensureUniqueConstraint(client);
    await client.query('BEGIN');

    let count = 0;
    for (const question of merged.values()) {
      await upsertQuestion(client, question);
      count++;
      if (count % 100 === 0) process.stdout.write(`\r${count}/${merged.size} inserted`);
    }

    await client.query('COMMIT');
    console.log(`\n\nInserted/updated ${count} questions`);

    // Summary
    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE difficulty = 'easy') as easy,
        COUNT(*) FILTER (WHERE difficulty = 'medium') as medium,
        COUNT(*) FILTER (WHERE difficulty = 'hard') as hard
      FROM questions
    `);

    const companyResult = await client.query(`
      SELECT company, COUNT(*) as count
      FROM questions, unnest(companies) as company
      WHERE company = ANY($1)
      GROUP BY company
      ORDER BY count DESC
    `, [TARGET_COMPANIES]);

    console.log('\nDatabase summary:');
    console.log(`Total: ${result.rows[0].total} | Easy: ${result.rows[0].easy} | Medium: ${result.rows[0].medium} | Hard: ${result.rows[0].hard}`);
    console.log('\nQuestions per company:');
    for (const row of companyResult.rows) {
      console.log(`  ${row.company}: ${row.count}`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nETL failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\nETL complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
