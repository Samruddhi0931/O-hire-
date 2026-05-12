import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { fetchLeetcodeQuestion } from '../services/leetcode';
const router = Router();
router.use(authenticate);

/**
 * Mock Interview Mode
 *
 * Flow:
 * 1. POST /start — pick company + difficulty, get a random question, start timer
 * 2. POST /:sessionId/submit — submit code, get AI feedback as structured JSON
 * 3. GET /history — past sessions with scores
 */

// Start a mock interview session
router.post('/start', async (req: AuthRequest, res) => {
  const { company, difficulty, category = 'dsa' } = req.body;

  // Pick a random question matching the filters
  let q = `SELECT * FROM questions WHERE category = $1`;
  const params: any[] = [category];

  if (company) { params.push(company); q += ` AND $${params.length} = ANY(companies)`; }
  if (difficulty) { params.push(difficulty); q += ` AND difficulty = $${params.length}`; }

  // Exclude recently attempted questions
  q += ` AND id NOT IN (
    SELECT question_id FROM interview_sessions
    WHERE user_id = $${params.length + 1}
    AND started_at > NOW() - INTERVAL '7 days'
  )`;
  params.push(req.userId);
  q += ' ORDER BY RANDOM() LIMIT 1';

  const questionResult = await query(q, params);
  if (!questionResult.rows[0]) {
    return res.status(404).json({ error: 'No questions found for these filters' });
  }

  const question = questionResult.rows[0];

  // Fetch full description from Leetcode GraphQL
  let leetcodeContent = null;
  if (question.url) {
    const slug = question.url.match(/\/problems\/([^/]+)/)?.[1];
    if (slug) leetcodeContent = await fetchLeetcodeQuestion(slug);
  }

  // Create session
  const session = await query(
    `INSERT INTO interview_sessions (user_id, question_id, company, started_at)
     VALUES ($1, $2, $3, NOW()) RETURNING *`,
    [req.userId, question.id, company]
  );

  res.json({
    sessionId: session.rows[0].id,
    question: {
      ...question,
      content: leetcodeContent?.content || null,
      exampleTestcases: leetcodeContent?.exampleTestcases || null,
      hints: leetcodeContent?.hints || [],
    },
    startedAt: session.rows[0].started_at,
    timeLimit: 45 * 60,
  });
});

// Submit solution and get AI feedback
router.post('/:sessionId/submit', async (req: AuthRequest, res) => {
  const { code, language = 'javascript' } = req.body;

  // Verify session belongs to user
  const sessionResult = await query(
    `SELECT s.*, q.title, q.difficulty FROM interview_sessions s
     JOIN questions q ON s.question_id = q.id
     WHERE s.id = $1 AND s.user_id = $2`,
    [req.params.sessionId, req.userId]
  );

  if (!sessionResult.rows[0]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessionResult.rows[0];
  const durationSeconds = Math.floor(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  // Get AI feedback
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: `You are a senior software engineer at Google reviewing a mock interview solution.

Problem: ${session.title} (${session.difficulty} difficulty)
Language: ${language}
Code submitted:
\`\`\`${language}
${code}
\`\`\`

Analyze this solution and return ONLY a JSON object with exactly these fields:
{
  "timeComplexity": "O(...) — brief explanation",
  "spaceComplexity": "O(...) — brief explanation",
  "correctness": "correct" | "partially correct" | "incorrect",
  "edgeCasesMissed": ["list of edge cases not handled"],
  "suggestions": ["list of specific improvements"],
  "score": <integer 0-100>,
  "summary": "2-3 sentence overall assessment"
}`
    }],
    response_format: { type: 'json_object' }
  });

  const feedback = JSON.parse(completion.choices[0].message.content!);

  // Save result to session
  await query(
    `UPDATE interview_sessions
     SET code_submitted=$1, feedback=$2, duration_seconds=$3, completed_at=NOW()
     WHERE id=$4`,
    [code, JSON.stringify(feedback), durationSeconds, req.params.sessionId]
  );

  res.json({ feedback, durationSeconds });
});

// Get interview history
router.get('/history', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT s.id, s.company, s.duration_seconds, s.started_at, s.completed_at,
            s.feedback->>'score' as score,
            s.feedback->>'correctness' as correctness,
            q.title, q.difficulty
     FROM interview_sessions s
     JOIN questions q ON s.question_id = q.id
     WHERE s.user_id = $1 AND s.completed_at IS NOT NULL
     ORDER BY s.started_at DESC LIMIT 20`,
    [req.userId]
  );
  res.json(result.rows);
});

export default router;
