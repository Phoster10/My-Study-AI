# Critical Evaluation

> **How to use this file.** Sections 1, 2, 3 and 6 are filled from facts in the repository and from a verification run of the tests and builds. Check them against your own memory and adjust. Sections marked **✍ YOUR TURN** must be written in your own words: the assignment asks for *personal* reflection, and a presentation is much stronger when it contains real moments only you experienced.

## 1. Was the goal achieved? — Content

| Req | Result |
|-----|--------|
| F1 Auth | ✅ Register, log in, log out, protected routes |
| F2 Ingest | ✅ Paste text, upload PDF / DOCX / TXT |
| F3 Summaries and flashcards | ✅ Bullet, short, detailed, flashcards (flip-card deck) |
| F4 History | ✅ Save summaries and flashcard sets, reopen and delete them |
| F5 Exam from a saved note | ✅ AI-generated 5- or 10-question multiple-choice exam |
| F6 Auto-grading | ✅ Grading engine with cheap deterministic checks first, then embeddings (optional), then an LLM judge; confidence scores and manual-review flags |
| F7–F10 extras | ✅ XP and daily goals, Ask-AI bar, account page, feature guide |

Compared with the first concept version (see "Document history" in `concept.md`), the standalone 10-question practice exam and SM-2 spaced-repetition review were removed. State this openly in the presentation as a deliberate scope decision.

Partly achieved or limited:
- Streaks and daily-goal check-marks live in `localStorage`, so they reset when site data is cleared or on another device. XP itself is stored server-side.
- The grading engine can grade short-answer questions semantically, but the interface only offers multiple-choice exams, so most of that engine is exercised only by tests and the API.
- Grading quality was only checked against mocked LLM responses, never measured on a real set of student answers.

## 2. Was the goal achieved? — Technical

| Area | Result |
|------|--------|
| SPA with a modern framework | React 18 + Vite + TypeScript, client-side routing |
| Backend | Express + TypeScript, 7 route modules, JWT verification, Supabase with Row Level Security |
| Tests | Backend 164 tests, frontend 132 tests, all passing; statement coverage 95.9 % and 96.9 % |
| CI | GitHub Actions runs type-check, tests and builds for both parts |
| Docker | Both Dockerfiles use multi-stage builds, Compose starts both services, backend has a healthcheck, `.dockerignore` keeps secrets out of images |
| Documentation | Header comments in modules, README, concept with wireframes, C4 diagrams, ER diagram, test traceability |

**✍ YOUR TURN:** state on which operating system you ran `docker compose up --build` from a clean clone, and whether it worked first time. This could not be verified automatically and the examiner may ask.

## 3. Improvements for the future
1. **Protect the AI endpoints.** `summarize`, `search`, `exam` and `ingest` do not require login, so anyone who can reach the API can use up the Groq quota. Fix: apply `requireAuth` and add rate limiting (e.g. `express-rate-limit`).
2. **Offer short-answer exams in the UI.** The API and grading engine already support them, and they are where semantic grading adds the most value.
3. **Server-side activity log** so streaks and goals survive clearing the browser and work across devices.
4. **Browser end-to-end tests** (Playwright) and an automated Docker smoke test, the two gaps listed in `docs/testing.md`.
5. **Measure grading quality** on a small labelled set of real answers, to check the confidence thresholds.
6. **Streaming LLM responses** so long summaries appear progressively.
7. Re-introduce spaced repetition (SM-2) if a review queue turns out to be wanted, and the other items from the original concept: image OCR, leaderboard.

## 4. Lessons learned  ✍ YOUR TURN
Write 4–6 sentences each, in your own words, with a concrete example. Prompts, with facts from the repository you can build on:

- **Scope.** The concept listed XP, daily goals, search and notifications as out of scope, they were added later anyway, and the practice-exam page and spaced repetition were removed at the end. What did adding and cutting features cost or gain? What would you do differently with Scrum (e.g. sprint goals, a "definition of done")?
- **Refactoring.** The grader started as one ~1,100-line file and was split into seven modules plus an orchestrator. What did that make easier to test?
- **A bug found by reading code.** The original XP endpoint was never called by the frontend, and it trusted a `userId` from the request body. What does that tell you about reviewing inherited code?
- **Tests as a safety net.** A leftover test still expected History to be a placeholder after the page was built, so the test suite was failing. What went wrong in the process that let tests and features drift apart?
- **Secrets and Docker.** Without a `.dockerignore`, `COPY . .` would have copied `.env` into the image. What did you learn about secrets?

## 5. Personal development  ✍ YOUR TURN
Describe how you changed as a developer during the project. Possible angles (keep only what is true for you): TypeScript on the backend, mocking external services in tests, Docker and Compose, C4 and Mermaid diagrams, working with an LLM API, working alone in Scrum. Say what you could not do at the start and can do now, and what you still find hard.

## 6. What went well / what went badly
Concrete points, taken from the repository history. Add your own feelings about each one.

**Went well**
- Cheap-first grading design kept LLM cost and latency low and made most grading logic unit-testable.
- Typed API client plus mocked services made frontend and backend tests fast and deterministic.
- Row Level Security and the user id coming from the JWT gave defence in depth for user data.

**Went badly or was costly**
- Scope changed after the concept was approved (features added, then two removed), and the documentation fell behind the code each time.
- Documentation, wireframes and tests were not updated in the same sprint as the features.
- LLM output cannot be tested deterministically, so prompt quality remained a manual concern.
