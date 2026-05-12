import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { calculateReadinessScore } from '../services/readinessScore';

const router = Router();
router.use(authenticate);

/**
 * Company-Specific Readiness Report
 *
 * Uses PostgreSQL CTEs to join questions, progress, and flashcard
 * data in a single query — avoids N+1 by aggregating at DB level.
 *
 * Returns:
 * - Overall readiness score for the company
 * - Questions breakdown (total, solved, attempted, unsolved)
 * - Topic breakdown (which topics this company tests + your strength)
 * - Recommended focus areas (high-frequency weak topics)
 */

router.get('/:company', async (req: AuthRequest, res) => {
  const { company } = req.params;

  // CTE query — does all joins and aggregations in one round trip
  const reportQuery = `
    WITH company_questions AS (
      -- All questions tagged for this company
      SELECT q.id, q.title, q.difficulty, q.tags,
             COALESCE(uqp.status, 'unsolved') as status
      FROM questions q
      LEFT JOIN user_question_progress uqp
        ON q.id = uqp.question_id AND uqp.user_id = $1
      WHERE $2 = ANY(q.companies)
    ),
    topic_strength AS (
      -- Avg ease factor per topic tag (proxy for how well user knows each topic)
      SELECT
        unnest(f_topics.tags) as topic,
        AVG(f.ease_factor) as avg_ease,
        COUNT(f.id) as card_count
      FROM flashcards f
      JOIN (
        SELECT f2.id, t.name, ARRAY[t.name] as tags
        FROM flashcards f2
        JOIN topics t ON f2.topic_id = t.id
        WHERE f2.user_id = $1
      ) f_topics ON f.id = f_topics.id
      WHERE f.user_id = $1
      GROUP BY unnest(f_topics.tags)
    ),
    question_topics AS (
      -- For each question tag, count how often this company uses it
      SELECT
        unnest(tags) as topic,
        COUNT(*) as frequency,
        COUNT(*) FILTER (WHERE status = 'solved') as solved_count
      FROM company_questions
      GROUP BY unnest(tags)
    )
    SELECT
      qt.topic,
      qt.frequency,
      qt.solved_count,
      ROUND(COALESCE(ts.avg_ease, 2.5)::numeric, 2) as avg_ease,
      COALESCE(ts.card_count, 0) as flashcard_count,
      CASE
        WHEN COALESCE(ts.avg_ease, 2.5) >= 3.5 THEN 'strong'
        WHEN COALESCE(ts.avg_ease, 2.5) >= 2.5 THEN 'moderate'
        ELSE 'weak'
      END as strength
    FROM question_topics qt
    LEFT JOIN topic_strength ts ON qt.topic = ts.topic
    ORDER BY qt.frequency DESC, ts.avg_ease ASC
  `;

  const [topicBreakdown, questionBreakdown, readiness] = await Promise.all([
    query(reportQuery, [req.userId, company]),
    query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE COALESCE(uqp.status,'unsolved') = 'solved') as solved,
         COUNT(*) FILTER (WHERE COALESCE(uqp.status,'unsolved') = 'attempted') as attempted,
         COUNT(*) FILTER (WHERE COALESCE(uqp.status,'unsolved') = 'unsolved') as unsolved,
         COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_total,
         COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_total,
         COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_total
       FROM questions q
       LEFT JOIN user_question_progress uqp ON q.id = uqp.question_id AND uqp.user_id = $1
       WHERE $2 = ANY(q.companies)`,
      [req.userId, company]
    ),
    calculateReadinessScore(req.userId!, company),
  ]);

  // Focus areas = high frequency topics where user is weak
  const focusAreas = topicBreakdown.rows
    .filter((t: any) => t.strength === 'weak' || t.strength === 'moderate')
    .slice(0, 3)
    .map((t: any) => ({
      topic: t.topic,
      reason: t.avg_ease < 2.0
        ? 'Low retention — review your flashcards'
        : 'Frequently tested — solve more questions',
      frequency: t.frequency,
    }));

  // Save readiness snapshot for trend chart
  await query(
    `INSERT INTO readiness_snapshots
     (user_id, company, score, retention_score, completion_score, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.userId, company, readiness.overall, readiness.retentionScore,
    readiness.completionScore, readiness.confidenceScore]
  );

  res.json({
    company,
    readiness,
    questions: questionBreakdown.rows[0],
    topicBreakdown: topicBreakdown.rows,
    focusAreas,
  });
});

// Readiness score trend over time for a company
router.get('/:company/trend', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT score, retention_score, completion_score, confidence_score, captured_at
     FROM readiness_snapshots
     WHERE user_id = $1 AND company = $2
     ORDER BY captured_at ASC LIMIT 30`,
    [req.userId, req.params.company]
  );
  res.json(result.rows);
});

export default router;
