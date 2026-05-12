import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import redis from '../db/redis';

const router = Router();
router.use(authenticate);

// Get questions filtered by company, category, difficulty — Redis cached
router.get('/', async (req: AuthRequest, res) => {
  const { company, category, difficulty } = req.query;
  const cacheKey = `questions:${company || 'all'}:${category || 'all'}:${difficulty || 'all'}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  } catch {}

  let queryText = 'SELECT * FROM questions WHERE 1=1';
  const params: any[] = [];

  if (company) { params.push(company); queryText += ` AND $${params.length} = ANY(companies)`; }
  if (category) { params.push(category); queryText += ` AND category = $${params.length}`; }
  if (difficulty) { params.push(difficulty); queryText += ` AND difficulty = $${params.length}`; }
  queryText += ' ORDER BY difficulty ASC LIMIT 50';

  const result = await query(queryText, params);
  try { await redis.setex(cacheKey, 3600, JSON.stringify(result.rows)); } catch {}
  res.json(result.rows);
});

// Mark question solved/attempted
router.post('/:id/progress', async (req: AuthRequest, res) => {
  const { status } = req.body;
  const result = await query(
    `INSERT INTO user_question_progress (user_id, question_id, status, solved_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, question_id) DO UPDATE SET status=$3, solved_at=$4 RETURNING *`,
    [req.userId, req.params.id, status, status === 'solved' ? new Date() : null]
  );
  res.json(result.rows[0]);
});

// Get user's progress across all questions
router.get('/my-progress', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT q.*, uqp.status, uqp.solved_at FROM questions q
     LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = $1`,
    [req.userId]
  );
  res.json(result.rows);
});

export default router;
