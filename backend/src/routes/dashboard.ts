import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { calculateReadinessScore } from '../services/readinessScore';
import { applyDecay, updateStudyStreak } from '../services/decay';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res) => {
  const { company } = req.query;

  // Apply decay check on every dashboard load
  const decayResult = await applyDecay(req.userId!);

  const [topics, cards, solved, due, weakTopics, readiness] = await Promise.all([
    query('SELECT status, COUNT(*) FROM topics WHERE user_id=$1 GROUP BY status', [req.userId]),
    query('SELECT COUNT(*) FROM flashcards WHERE user_id=$1', [req.userId]),
    query(`SELECT COUNT(*) FROM user_question_progress WHERE user_id=$1 AND status='solved'`, [req.userId]),
    query('SELECT COUNT(*) FROM flashcards WHERE user_id=$1 AND next_review <= NOW()', [req.userId]),
    query(
      `SELECT t.name, AVG(f.ease_factor) as avg_ease, COUNT(f.id) as card_count
       FROM flashcards f JOIN topics t ON f.topic_id = t.id
       WHERE f.user_id=$1 GROUP BY t.name ORDER BY avg_ease ASC LIMIT 5`,
      [req.userId]
    ),
    calculateReadinessScore(req.userId!, company as string | undefined),
  ]);

  const streakResult = await query(
    'SELECT study_streak, last_studied_at FROM users WHERE id=$1',
    [req.userId]
  );

  res.json({
    topics: topics.rows,
    totalCards: parseInt(cards.rows[0].count),
    solvedQuestions: parseInt(solved.rows[0].count),
    cardsDue: parseInt(due.rows[0].count),
    weakTopics: weakTopics.rows,
    readiness,
    streak: {
      days: streakResult.rows[0]?.study_streak || 0,
      lastStudied: streakResult.rows[0]?.last_studied_at,
    },
    decayWarning: decayResult.warning,
  });
});

// Called after any flashcard review session to update streak
router.post('/study-session', async (req: AuthRequest, res) => {
  const streak = await updateStudyStreak(req.userId!);
  res.json({ streak });
});

export default router;
