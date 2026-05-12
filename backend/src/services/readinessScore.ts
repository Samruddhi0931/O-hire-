import { query } from '../db';

export interface ReadinessBreakdown {
  overall: number;
  retentionScore: number;
  completionScore: number;
  confidenceScore: number;
  label: string;
  weakTopics: string[];
}

/**
 * Interview Readiness Score (0-100)
 *
 * Weighted formula:
 *   40% — SM-2 retention (avg ease factor across all cards, normalized 0-100)
 *   40% — Question completion (% of company-tagged questions solved)
 *   20% — Topic confidence (% of topics marked 'confident')
 *
 * Design decision: retention and completion weighted equally because
 * you can solve questions mechanically without truly understanding —
 * the SM-2 data catches that gap.
 */
export async function calculateReadinessScore(
  userId: number,
  company?: string
): Promise<ReadinessBreakdown> {

  // 1. Retention score — avg ease factor, normalized
  // SM-2 ease factor ranges from 1.3 (struggling) to ~4.0 (mastered)
  // Normalize to 0-100: (avgEase - 1.3) / (4.0 - 1.3) * 100
  const retentionResult = await query(
    `SELECT AVG(ease_factor) as avg_ease, COUNT(*) as total
     FROM flashcards WHERE user_id = $1`,
    [userId]
  );
  const avgEase = parseFloat(retentionResult.rows[0].avg_ease) || 2.5;
  const totalCards = parseInt(retentionResult.rows[0].total) || 0;
  const retentionScore = totalCards === 0
    ? 0
    : Math.min(100, Math.round(((avgEase - 1.3) / (4.0 - 1.3)) * 100));

  // 2. Completion score — % of company questions solved
  let completionScore = 0;
  if (company) {
    const completionResult = await query(
      `SELECT
         COUNT(q.id) as total,
         COUNT(uqp.id) FILTER (WHERE uqp.status = 'solved') as solved
       FROM questions q
       LEFT JOIN user_question_progress uqp
         ON q.id = uqp.question_id AND uqp.user_id = $1
       WHERE $2 = ANY(q.companies)`,
      [userId, company]
    );
    const total = parseInt(completionResult.rows[0].total) || 0;
    const solved = parseInt(completionResult.rows[0].solved) || 0;
    completionScore = total === 0 ? 0 : Math.round((solved / total) * 100);
  } else {
    // No company filter — use overall question completion
    const completionResult = await query(
      `SELECT
         COUNT(q.id) as total,
         COUNT(uqp.id) FILTER (WHERE uqp.status = 'solved') as solved
       FROM questions q
       LEFT JOIN user_question_progress uqp
         ON q.id = uqp.question_id AND uqp.user_id = $1`,
      [userId]
    );
    const total = parseInt(completionResult.rows[0].total) || 0;
    const solved = parseInt(completionResult.rows[0].solved) || 0;
    completionScore = total === 0 ? 0 : Math.round((solved / total) * 100);
  }

  // 3. Confidence score — % of topics marked 'confident'
  const confidenceResult = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'confident') as confident
     FROM topics WHERE user_id = $1`,
    [userId]
  );
  const totalTopics = parseInt(confidenceResult.rows[0].total) || 0;
  const confidentTopics = parseInt(confidenceResult.rows[0].confident) || 0;
  const confidenceScore = totalTopics === 0
    ? 0
    : Math.round((confidentTopics / totalTopics) * 100);

  // 4. Weak topics — lowest avg ease factor
  const weakResult = await query(
    `SELECT t.name FROM flashcards f
     JOIN topics t ON f.topic_id = t.id
     WHERE f.user_id = $1
     GROUP BY t.name
     ORDER BY AVG(f.ease_factor) ASC LIMIT 3`,
    [userId]
  );
  const weakTopics = weakResult.rows.map((r: any) => r.name);

  // Weighted overall score
  const overall = Math.round(
    retentionScore * 0.4 +
    completionScore * 0.4 +
    confidenceScore * 0.2
  );

  // Human-readable label
  const label =
    overall >= 80 ? 'Interview Ready' :
    overall >= 60 ? 'Almost There' :
    overall >= 40 ? 'Getting There' :
    'Early Stage';

  return { overall, retentionScore, completionScore, confidenceScore, label, weakTopics };
}
