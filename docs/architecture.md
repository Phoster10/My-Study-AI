# Architecture

Notation: C4 model, drawn with plain Mermaid flowcharts so they render reliably on GitHub and in mermaid.live (Mermaid's dedicated C4 syntax is still experimental). Export PNG/SVG for your slides.

## Level 1 — System context
```mermaid
flowchart LR
  student([Student])
  studyai["<b>Study AI</b><br/>Summaries, flashcards, auto-graded exams,<br/>History, XP"]
  supabase[("Supabase<br/>Auth + PostgreSQL")]
  groq["Groq API<br/>LLM inference"]
  emb["Voyage / OpenAI<br/>Embeddings (optional)"]
  student -- "uses via browser (HTTPS)" --> studyai
  studyai -- "auth, XP, saved summaries" --> supabase
  studyai -- "prompts" --> groq
  studyai -- "similarity vectors" --> emb
```

## Level 2 — Containers (what `docker compose up` starts)
```mermaid
flowchart LR
  student([Student])
  subgraph compose[Docker Compose]
    spa["<b>frontend container</b><br/>React + Vite SPA<br/>served by nginx :8080"]
    api["<b>backend container</b><br/>Node + Express + TypeScript :4000"]
  end
  supabase[("Supabase<br/>Auth + Postgres")]
  groq["Groq API"]
  emb["Embeddings API (optional)"]
  student -- "HTTP" --> spa
  spa -- "JSON + Bearer JWT" --> api
  spa -- "sign-in / sign-up only" --> supabase
  api -- "verify JWT, read/write XP,<br/>summaries, account (service-role key)" --> supabase
  api -- "chat completions" --> groq
  api -- "embeddings" --> emb
```

## Level 3 — Frontend components (SPA)
```mermaid
flowchart TD
  main[main.tsx] --> App["App.tsx<br/>BrowserRouter"]
  App --> PH[PublicHeader] --> Public["Landing / Login / Register"]
  App --> PR[ProtectedRoute] --> Layout["AppLayout<br/>Sidebar + TopBar + Outlet"]
  Layout --> Onb[OnboardingModal]
  Layout --> Side["Sidebar<br/>Home, XP, History"]
  Layout --> Top["TopBar<br/>search, NotificationsMenu, avatar menu"]
  Layout --> Home["Home<br/>/dashboard"]
  Layout --> XPHub["XPHub<br/>/xp"]
  Layout --> Hist["History<br/>/history"]
  Layout --> Acc["Account<br/>/account"]
  Home --> SR[SearchResults]
  Home --> FD1[FlashcardDeck]
  Hist --> FD2[FlashcardDeck]
  Hist --> EM[ExamModal]
  Home & Top --> Store[("useStudyStore<br/>zustand")]
  Home & XPHub & Hist & EM & Acc & Top --> Client["api/client.ts<br/>typed fetch + JWT"]
  Top & XPHub & Side --> XPH["useXP / useDailyGoals /<br/>useActivityStats"]
  XPH -. "streak, goals (localStorage)" .-> LS[(Browser storage)]
  Public & PR & Top & Acc --> Auth["useAuth / lib/supabase<br/>sign-in, sign-up, session"]
  Client -. session token .-> Auth
```

## Level 3 — Backend components (API)
```mermaid
flowchart LR
  subgraph API[Express API — app.ts]
    I["routes/ingest"]
    S["routes/summarize"]
    SE["routes/search"]
    E["routes/exam"]
    X["routes/xp"]
    SU["routes/summaries"]
    AC["routes/account"]
    MW["middleware<br/>requireAuth (JWT) + errorHandler"]
    G["grading/<br/>orchestrator + 7 modules"]
    LG[lib/groq]
    LS[lib/supabase]
  end
  Parsers["multer + pdf-parse + mammoth<br/>(in-process libraries)"]
  I --> Parsers
  S --> LG
  SE --> LG
  E --> LG
  E --> G
  G --> LG
  G --> Emb["Embeddings API (optional)"]
  X & SU & AC --> MW
  X & SU & AC --> LS
  MW --> LS
  LG --> Groq[(Groq)]
  LS --> Supa[(Supabase)]
```

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/ingest` | public | Extract text from PDF / DOCX / TXT |
| `POST /api/summarize` | public | Bullet, short, detailed summary or flashcards |
| `POST /api/search` | public | Answer a general question (Ask-AI bar) |
| `POST /api/exam/generate`, `/grade` | public | Create a 5/10-question MCQ exam; grade answers |
| `GET /api/xp`, `POST /api/xp/update` | JWT | Read / add XP |
| `GET/POST/DELETE /api/summaries` | JWT | History |
| `PATCH /api/account/username`, `/password`, `DELETE /api/account` | JWT | Account management |

## Data model (Supabase / PostgreSQL)
```mermaid
erDiagram
  AUTH_USERS ||--o| USER_STATS : "has"
  AUTH_USERS ||--o{ SUMMARIES : "owns"
  USER_STATS {
    uuid user_id PK
    int xp
  }
  SUMMARIES {
    uuid id PK
    uuid user_id FK
    text title
    text summary_type
    text source_text
    text summary_text
  }
```
Both tables use `ON DELETE CASCADE` on the user and have Row Level Security enabled, so deleting an account removes every trace of the user's data.

## Grading pipeline (key algorithm)
```mermaid
flowchart TD
  A[Answer] --> B{MCQ and unambiguous?}
  B -- yes --> Z["Graded: mcq"]
  B -- no --> C["Deterministic checks<br/>blank, contradiction, stuffing,<br/>exact, containment, fuzzy"]
  C -- decided --> Y["Graded: deterministic"]
  C -- ambiguous --> D["Embedding similarity (if configured)"]
  D -- ">= 0.92" --> X["Graded: embedding"]
  D -- otherwise --> E["LLM judge<br/>(prompt-injection sanitised)"]
  E --> F["Fuse confidence +<br/>manual-review flags"]
  E -- "error / missing" --> G["Graded: error, flagged for review"]
```

## Sequence — take an exam from History and earn XP
```mermaid
sequenceDiagram
  participant U as Student
  participant S as SPA (History + ExamModal)
  participant A as API
  participant D as Supabase
  U->>S: Open saved note, tap Take Exam
  S->>A: POST /api/exam/generate (saved source text)
  A-->>S: MCQ questions
  U->>S: Answer and submit
  S->>A: POST /api/exam/grade
  A-->>S: GradingReport
  S->>A: POST /api/xp/update (10 XP per correct answer, Bearer JWT)
  A->>D: verify token, add to user_stats.xp
  S-->>U: Score + updated XP
```

## Key design decisions
- **Separate SPA and API** so secrets stay server-side and each part is independently testable and deployable
- **Auth in the browser, verification in the API**: Supabase issues tokens; the API validates them and never handles passwords
- **Cheap-first grading**: the LLM is a last resort, keeping cost, latency and hallucination risk down
- **Server-owned identity**: routes that touch user data take the user id from the verified JWT, never from the request body
- **Server truth for XP, browser convenience for streaks**: XP lives in `user_stats`; streaks and goal check-marks are `localStorage` indicators that may reset
- **Merged ingestion**: one `/api/ingest` replaces three duplicate extract routes
