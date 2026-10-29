/**
 * Simplified SM-2 style spaced-repetition scheduler.
 *
 * Every reviewed topic carries an ease factor, an interval (days) and a
 * repetition count. A correct review grows the interval; an incorrect
 * review resets it to zero so the topic reappears immediately.
 */

export interface TopicMemory {
  topic: string;
  interval: number;
  repetition: number;
  easeFactor: number;
  lastReviewed: number;
  nextReviewDate: number;
}

const MS_IN_DAY = 86_400_000;
const MIN_EASE_FACTOR = 1.3;

export function processReview(topicData: Partial<TopicMemory> | undefined, isCorrect: boolean): Omit<TopicMemory, "topic"> {
  let easeFactor = typeof topicData?.easeFactor === "number" ? topicData.easeFactor : 2.5;
  let interval = typeof topicData?.interval === "number" ? topicData.interval : 0;
  let repetition = typeof topicData?.repetition === "number" ? topicData.repetition : 0;

  if (isCorrect) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * easeFactor));

    repetition += 1;
    easeFactor += 0.1;
  } else {
    repetition = 0;
    interval = 0;
    easeFactor -= 0.2;
  }

  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

  const now = Date.now();
  return { easeFactor, interval, repetition, nextReviewDate: now + interval * MS_IN_DAY, lastReviewed: now };
}

/** Returns up to `limit` topics that are due for review, oldest-due first. */
export function getDueTopics(topics: TopicMemory[], limit = 5): TopicMemory[] {
  const now = Date.now();
  return topics
    .filter((t) => typeof t.nextReviewDate === "number" && t.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate)
    .slice(0, limit);
}
