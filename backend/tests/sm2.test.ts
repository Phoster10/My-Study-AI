import { describe, it, expect } from "vitest";
import { processReview, getDueTopics, type TopicMemory } from "../src/spacedRepetition/sm2.js";

describe("processReview", () => {
  it("sets a 1-day interval on the first correct review", () => {
    const result = processReview(undefined, true);
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
  });

  it("sets a 6-day interval on the second consecutive correct review", () => {
    const first = processReview(undefined, true);
    const second = processReview(first, true);
    expect(second.repetition).toBe(2);
    expect(second.interval).toBe(6);
  });

  it("grows the interval using the ease factor on later reviews", () => {
    const r1 = processReview(undefined, true);
    const r2 = processReview(r1, true);
    const r3 = processReview(r2, true);
    expect(r3.interval).toBeGreaterThan(r2.interval);
  });

  it("resets repetition and interval on an incorrect review", () => {
    const r1 = processReview(undefined, true);
    const r2 = processReview(r1, true);
    const r3 = processReview(r2, false);
    expect(r3.repetition).toBe(0);
    expect(r3.interval).toBe(0);
  });

  it("never lets the ease factor drop below 1.3", () => {
    let state: TopicMemory | undefined = undefined;
    for (let i = 0; i < 20; i++) {
      state = { topic: "x", ...processReview(state, false) };
    }
    expect(state!.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("getDueTopics", () => {
  const now = Date.now();
  const topic = (name: string, dueInMs: number): TopicMemory => ({
    topic: name,
    interval: 1,
    repetition: 1,
    easeFactor: 2.5,
    lastReviewed: now,
    nextReviewDate: now + dueInMs,
  });

  it("only returns topics whose review date has passed", () => {
    const topics = [topic("overdue", -1000), topic("future", 100000)];
    const due = getDueTopics(topics);
    expect(due.map((t) => t.topic)).toEqual(["overdue"]);
  });

  it("sorts the most overdue topics first", () => {
    const topics = [topic("a", -1000), topic("b", -5000)];
    const due = getDueTopics(topics);
    expect(due[0].topic).toBe("b");
  });

  it("caps results at the given limit", () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(`t${i}`, -1000));
    expect(getDueTopics(topics, 5)).toHaveLength(5);
  });
});
