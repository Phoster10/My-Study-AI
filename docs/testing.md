# Test strategy and traceability

Run: `cd backend && npm run test:coverage` · `cd frontend && npm run test:coverage` (CI runs both, plus type-check and build).

**Current result:** backend 18 test files / 164 tests, frontend 22 test files / 132 tests, all passing.

| Level | Backend (Vitest + supertest) | Frontend (Vitest + Testing Library) |
|-------|------------------------------|-------------------------------------|
| Unit | grading modules (normalize, mcq, textMatch, deterministicCheck, confidence, embeddings, aiGrader) | zustand store, api client, hooks (`useAuth`, `useXP`, `useDailyGoals`, `useActivityStats`) |
| Component / integration | HTTP routes driven in-process with Groq + Supabase mocked (ingest, summarize, search, exam, xp, summaries, account, auth middleware); grading orchestrator with AI + embeddings mocked | every page and component, `ProtectedRoute`, full `<App/>` routing |
| Not automated | live LLM output quality, real Supabase, browser end-to-end, Docker startup | same |

## Requirement → test traceability
| Req | Tests |
|-----|-------|
| F1 Auth | `AuthPages`, `ProtectedRoute`, `useAuth`, `App.routing` (frontend); `api.integration` 401 (backend) |
| F2 Ingest | `ingest.test` (pdf, docx, txt, 415, parser failure), `api.integration` (pasted text); `Home` (file upload, paste, character limit) |
| F3 Summarize / flashcards | `summarizeRoute.test` (4 prompt types, validation, 502); `Home` (summary types, generate, save), `FlashcardDeck` |
| F4 History (save / reopen / delete) | `summaries.test` (list, get, create, delete, ownership, validation); `History` (list, open, delete, empty state, take exam), `Home` (save flow) |
| F5 Exam generation | `examGenerate.test`, `examGenerateCount.test` (success, truncate, pad, prose-wrapped JSON, fallback, LLM failure, 5 vs 10 questions, MCQ-only); `ExamModal` |
| F6 Grading | `gradingOrchestrator`, `deterministicCheck`, `textMatch*`, `mcq`, `confidence`, `aiGrader`, `embeddings`; `ExamModal` (score and per-question result rendering) |
| F7 XP, levels, daily goals | `xp.test` (read, add, validation, auth); `XPHub`, `Sidebar` (XP badge), `useXP`, `useDailyGoals`, `useActivityStats` |
| F8 Ask-AI search | `search.test`; `TopBar` (anonymous redirect, signed-in search), `SearchResults` |
| F9 Account | `account.test` (username / password validation, update, delete, auth); `Account`, `TopBar` (delete flow) |
| F10 Guide and onboarding | `NotificationsMenu`, `OnboardingModal` |
| Navigation | `Sidebar` (Home, XP, History links only), `AppLayout`, `App.routing`, `PublicPages` (landing + public header) |
| Security | prompt-injection redaction (`normalize`, `aiGrader`), JWT enforcement on `xp`, `summaries`, `account` routes |

## Coverage (statements, measured)
| | Statements | Branches | Functions |
|---|-----------|----------|-----------|
| Backend | 95.9 % | 86.9 % | 93.3 % |
| Frontend | 96.9 % | 90.3 % | 87.1 % |

Uncovered backend code is deliberately limited to process bootstrap (`index.ts`) and the two SDK client constructors (`lib/groq.ts`, `lib/supabase.ts`).

## Known limitations (state these in your evaluation)
- LLM calls are mocked, so prompt quality and JSON-shape drift are not tested automatically
- No browser E2E (e.g. Playwright) and no automated Docker smoke test
- The interface only offers multiple-choice exams, so the grading engine's short-answer path (deterministic checks, embeddings, LLM judge) is tested through the API and unit tests, not through the UI
- Streaks and daily-goal check-marks use `localStorage`; the tests cover their logic, not behaviour across browsers or after clearing site data
