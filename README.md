# Study AI

Turn notes into a study loop: **ingest → summarize → save to History → auto-graded multiple-choice exam**, with XP levels and daily goals.

| Page | Route | What it does |
|------|-------|--------------|
| Home | `/dashboard` | Upload or paste notes, choose a summary type or flashcards, save to History |
| XP | `/xp` | Level, streak and daily goals |
| History | `/history` | Reopen saved notes and take a 5- or 10-question multiple-choice exam from one |
| Account | `/account` | Username, password (delete account is in the avatar menu) |

- `frontend/` — React + Vite single-page application (served by nginx in Docker)
- `backend/` — Node + Express + TypeScript REST API
- `supabase/schema.sql` — database schema (run once in the Supabase SQL editor)
- `docs/` — written concept, wireframes (`docs/wireframes/`), C4 architecture, test traceability, evaluation

## Quick start (Docker)

1. Create a free [Supabase](https://supabase.com) project, run `supabase/schema.sql` in its SQL editor.
2. Get a [Groq](https://console.groq.com) API key.
3. Configure:
   ```bash
   cp .env.example .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
   cp backend/.env.example backend/.env    # GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ```
4. Run:
   ```bash
   docker compose up --build
   ```
5. Open http://localhost:8080 (API on http://localhost:4000, health at `/health`).

## Local development

```bash
cd backend  && npm install && npm run dev     # API on :4000
cd frontend && npm install && npm run dev     # SPA on :5173  (copy frontend/.env.example to .env)
```

## Tests

```bash
cd backend  && npm run test:coverage   # unit + HTTP integration (Groq/Supabase mocked)
cd frontend && npm run test:coverage   # components, pages, routing, hooks, API client
```
CI runs both plus builds on every push (`.github/workflows/ci.yml`). See `docs/testing.md` for the strategy and the requirement-to-test traceability table.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/ingest` | – | Text or file (.pdf/.docx/.txt) → plain text |
| POST | `/api/summarize` | – | Summary / flashcards |
| POST | `/api/exam/generate` | – | Multiple-choice exam from source text |
| POST | `/api/exam/grade` | – | Multi-signal grading report |
| GET | `/api/xp` | Bearer JWT | Total XP for the signed-in user |
| POST | `/api/xp/update` | Bearer JWT | Add `amount` XP, return the new total |
| POST | `/api/search` | – | Free-form AI Q&A (not tied to the user's notes) |
| GET | `/api/summaries` | Bearer JWT | List saved summaries (title, type, date — no full text) |
| GET | `/api/summaries/:id` | Bearer JWT | One summary in full, incl. source text (used to generate a History exam) |
| POST | `/api/summaries` | Bearer JWT | Save a summary |
| DELETE | `/api/summaries/:id` | Bearer JWT | Delete a saved summary |
| PATCH | `/api/account/username` | Bearer JWT | Change username (validated server-side) |
| PATCH | `/api/account/password` | Bearer JWT | Change password (validated server-side) |
| DELETE | `/api/account` | Bearer JWT | Permanently delete the signed-in user's account (admin API, cascades via FK) |

`/api/exam/generate` accepts `{ count: 5 | 10, mcqOnly: true }`. History's "Take Exam" flow always sends `mcqOnly: true`. Without it the API returns the original mix of 5 multiple-choice and 5 short-answer questions, which the grading engine can grade, but the interface does not offer that exam.

## Code documentation
Every module opens with a header comment explaining its role and design rationale (see `backend/src/grading/*`). Architecture diagrams: `docs/architecture.md`.

## Security notes
- **Never commit `.env` files.** `.gitignore` and `.dockerignore` exclude them; only the `*.env.example` templates belong in Git. If a key was ever committed or shared, rotate it in the Groq / Supabase dashboards.
- The frontend only ever receives the *public* Supabase URL and anon key. The service-role key and Groq key stay in `backend/.env`.
- `ingest`, `summarize`, `search` and `exam` are currently public, so anyone who can reach the API can spend LLM quota. Putting them behind `requireAuth` and adding rate limiting is the first hardening step (see `docs/evaluation.md`).

## History of the project
This app is a TypeScript rewrite of an earlier Next.js version. The rewrite merged three duplicate extract routes into `/api/ingest`, removed unused packages and dead code, split the grader into modules, and fixed two bugs in the original XP feature: the update endpoint was never called, and it trusted a `userId` from the request body (now read from the verified JWT). Features that were first cut (XP/levels, daily goals, search, notifications) were later rebuilt on purpose, and the standalone Practice Exam page and SM-2 spaced-repetition review were removed at the end; see "Document history" in `docs/concept.md`.
