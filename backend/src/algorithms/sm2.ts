export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0-5 (0=complete blackout, 3=correct with difficulty, 5=perfect recall)
 */
export function sm2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
): SM2Result {
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed — reset card
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * newEaseFactor);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return { easeFactor: newEaseFactor, interval: newInterval, repetitions: newRepetitions, nextReview };
}
