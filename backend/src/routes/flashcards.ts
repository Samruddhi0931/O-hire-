import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { sm2 } from '../algorithms/sm2';

const router = Router();
router.use(authenticate);

// Get cards due for review today
router.get('/due', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT f.*, t.name as topic_name FROM flashcards f
     JOIN topics t ON f.topic_id = t.id
     WHERE f.user_id = $1 AND f.next_review <= NOW()
     ORDER BY f.next_review ASC LIMIT 20`,
    [req.userId]
  );
  res.json(result.rows);
});

// Get all cards, optionally by topic
router.get('/', async (req: AuthRequest, res) => {
  const { topicId } = req.query;
  let q = 'SELECT * FROM flashcards WHERE user_id = $1';
  const params: any[] = [req.userId];
  if (topicId) { params.push(topicId); q += ` AND topic_id = $${params.length}`; }
  const result = await query(q, params);
  res.json(result.rows);
});

// Create card manually
router.post('/', async (req: AuthRequest, res) => {
  const { topicId, question, answer } = req.body;
  const result = await query(
    'INSERT INTO flashcards (user_id, topic_id, question, answer) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.userId, topicId, question, answer]
  );
  res.json(result.rows[0]);
});

// Review a card — apply SM-2 algorithm
router.post('/:id/review', async (req: AuthRequest, res) => {
  const { quality } = req.body; // 0-5
  const card = await query('SELECT * FROM flashcards WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!card.rows[0]) return res.status(404).json({ error: 'Card not found' });

  const { easeFactor, interval, repetitions, nextReview } = sm2(
    quality, card.rows[0].ease_factor, card.rows[0].interval, card.rows[0].repetitions
  );

  const updated = await query(
    `UPDATE flashcards SET ease_factor=$1, interval=$2, repetitions=$3, next_review=$4 WHERE id=$5 RETURNING *`,
    [easeFactor, interval, repetitions, nextReview, req.params.id]
  );
  res.json(updated.rows[0]);
});

// AI auto-generate flashcards from pasted notes
router.post('/generate', async (req: AuthRequest, res) => {
  const { topicId, notes } = req.body;
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: `Generate 5 flashcards from these study notes. Return only JSON in this format: {"flashcards":[{"question":"...","answer":"..."}]}. Notes: ${notes}`
    }],
    response_format: { type: 'json_object' }
  });

  const { flashcards } = JSON.parse(completion.choices[0].message.content!);
  const inserted = await Promise.all(
    flashcards.map((c: any) =>
      query('INSERT INTO flashcards (user_id, topic_id, question, answer) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.userId, topicId, c.question, c.answer])
    )
  );
  res.json(inserted.map(r => r.rows[0]));
});

export default router;
