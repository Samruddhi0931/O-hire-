import { query } from '../db';

/**
 * Study Decay Service
 *
 * If a user hasn't studied in 3+ days, overdue cards get their
 * interval reduced by 10% per day past due — pulling them back
 * into the review queue sooner.
 *
 * This models real memory decay: the longer you wait past the
 * optimal review window, the more you've forgotten.
 */

export interface DecayResult {
  affectedCards: number;
  daysSinceStudy: number;
  warning: string | null;
}

export async function applyDecay(userId: number): Promise<DecayResult> {
  // Get user's last study date
  const userResult = await query(
    'SELECT last_studied_at, study_streak FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];

  if (!user.last_studied_at) {
    return { affectedCards: 0, daysSinceStudy: 0, warning: null };
  }

  const now = new Date();
  const lastStudied = new Date(user.last_studied_at);
  const daysSinceStudy = Math.floor(
    (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only apply decay after 3 days of inactivity
  if (daysSinceStudy < 3) {
    return { affectedCards: 0, daysSinceStudy, warning: null };
  }

  const decayDays = daysSinceStudy - 2; // grace period of 2 days
  const decayMultiplier = Math.max(0.5, 1 - (decayDays * 0.10)); // max 50% reduction

  // Pull overdue cards closer by reducing their interval
  const result = await query(
    `UPDATE flashcards
     SET
       interval = GREATEST(1, ROUND(interval * $1)),
       next_review = LEAST(next_review, NOW() + (GREATEST(1, ROUND(interval * $1)) || ' days')::INTERVAL)
     WHERE user_id = $2
       AND next_review > NOW()
       AND repetitions > 0
     RETURNING id`,
    [decayMultiplier, userId]
  );

  const affectedCards = result.rowCount || 0;
  const warning = affectedCards > 0
    ? `You haven't studied in ${daysSinceStudy} days — ${affectedCards} cards have been pulled forward in your review queue.`
    : null;

  return { affectedCards, daysSinceStudy, warning };
}

export async function updateStudyStreak(userId: number): Promise<number> {
  const userResult = await query(
    'SELECT last_studied_at, study_streak FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  const now = new Date();

  let newStreak = 1;
  if (user.last_studied_at) {
    const lastStudied = new Date(user.last_studied_at);
    const daysDiff = Math.floor(
      (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 1) newStreak = (user.study_streak || 0) + 1; // consecutive day
    else if (daysDiff === 0) newStreak = user.study_streak || 1;  // same day
    else newStreak = 1; // streak broken
  }

  await query(
    'UPDATE users SET last_studied_at = $1, study_streak = $2 WHERE id = $3',
    [now, newStreak, userId]
  );

  return newStreak;
}
