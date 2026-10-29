import { useEffect, useState } from "react";
import { api } from "../api/client";

interface DueTopic {
  topic: string;
  nextReviewDate: number;
}

export function ReviewQueue() {
  const [due, setDue] = useState<DueTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dueTopics()
      .then((res) => setDue(res.due))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load review queue."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="panel">
      <h2>4. Due for review</h2>
      <p className="panel__hint">Topics from past exams that spaced repetition says you should revisit now.</p>

      {loading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && due.length === 0 && <p>Nothing due right now — take a practice exam to build your review queue.</p>}

      <ul className="review-queue">
        {due.map((t) => (
          <li key={t.topic}>{t.topic}</li>
        ))}
      </ul>
    </section>
  );
}
