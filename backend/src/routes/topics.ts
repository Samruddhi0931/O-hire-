import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT * FROM topics WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name, category } = req.body;
  const result = await query(
    'INSERT INTO topics (user_id, name, category) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, name, category]
  );
  res.json(result.rows[0]);
});

router.patch('/:id/status', async (req: AuthRequest, res) => {
  const { status } = req.body; // 'learning' | 'reviewed' | 'confident'
  const result = await query(
    'UPDATE topics SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
    [status, req.params.id, req.userId]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  await query('DELETE FROM topics WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

export default router;
