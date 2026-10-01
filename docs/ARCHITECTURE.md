# GitExplore V2 — Architecture

## 1. Architecture Principles

1. **Preserve V1.** The existing frontend works and is in production. V2 adds a backend and AI layer alongside it — not on top of a rewrite.
2. **Simple architecture.** One frontend, one backend, one database. No microservices, no service mesh, no Kubernetes, no Redis (unless a concrete workload proves it necessary).
3. **Problem-first engineering.** Every component exists to solve a defined problem from the PRD. No infrastructure for its own sake.
4. **Deterministic Git analysis.** Commit graphs, branch divergence, file churn, and statistics are computed deterministically from GitHub data. They do not depend on AI.
5. **AI grounded in evidence.** AI receives structured context payloads built from real repository data. AI does not query external sources independently.
6. **Strict TypeScript.** Both frontend and backend use TypeScript in strict mode with zero `any` and zero suppressions.
7. **Server-side secrets.** GitHub tokens, AI provider API keys, and database credentials never reach the browser. They live in environment variables on the backend.
8. **Minimal dependencies.** Use the standard library and proven minimal packages. Do not introduce heavyweight frameworks without justification.
9. **Incremental migration.** V1 frontend API calls migrate to the backend one endpoint at a time. The frontend can fall back to direct GitHub calls during migration.
10. **Vertical feature development.** Each feature is built end-to-end (database → backend → frontend) rather than building all database tables first, then all routes, etc.

---

## 2. High-Level Architecture

```
                         GitExplore V2

  ┌──────────────────────────────────────────────┐
  │           React + TypeScript Frontend        │
  │   (Existing V1 + new workspace/AI UI)        │
  └─────────────────────┬────────────────────────┘
                        │ HTTPS
                        ▼
  ┌──────────────────────────────────────────────┐
  │      Node.js + TypeScript REST API           │
  │   (Express or similar minimal framework)     │
  └───────┬─────────────────┬────────────────────┘
          │                 │
          ▼                 ▼
  ┌───────────────┐  ┌──────────────┐
  │  GitHub API   │  │  PostgreSQL  │
  │  (REST v3)    │  │  (Prisma)    │
  └───────┬───────┘  └──────────────┘
          │
          ▼
  ┌───────────────────────────────────┐
  │    Repository Intelligence        │
  │    Engine (deterministic)         │
  └───────────────┬───────────────────┘
                  │
                  ▼
  ┌───────────────────────────────────┐
  │    AI Context Builder             │
  │    (structured evidence payload)  │
  └───────────────┬───────────────────┘
                  │
                  ▼
  ┌───────────────────────────────────┐
  │    AI Provider Abstraction        │
  │    (pluggable LLM interface)      │
  └───────────────┬───────────────────┘
                  │
                  ▼
  ┌───────────────────────────────────┐
  │    Structured AI Response         │
  │    (schema-validated output)      │
  └───────────────┬───────────────────┘
                  │
                  ▼
          Frontend renders result
```

### Component responsibilities:

- **Frontend**: User interface, client-side routing, API client calls to the GitExplore backend, workspace UI, AI result rendering.
- **Backend API**: Request routing, input validation, authentication, session management, response formatting. Orchestrates calls to GitHub, the intelligence engine, the database, and AI.
- **GitHub API**: External data source. Called from the backend with a server-side token.
- **PostgreSQL + Prisma**: Persistent storage for users, saved repositories, investigations, notes, bookmarks, tags, and cached AI analyses (hosted on Neon Free Plan, accessed via Prisma ORM).
- **Repository Intelligence Engine**: Deterministic computation of commit DAGs, statistics, branch divergence, file-change analysis. Pure functions operating on GitHub data.
- **AI Context Builder**: Assembles structured prompts from intelligence engine output. Manages context window limits and prompt versioning.
- **AI Provider**: Sends prompts to an LLM provider and returns raw responses. Abstracted behind an interface so providers can be swapped.
- **Structured AI Response**: Schema validation layer (Zod or equivalent) that ensures AI output conforms to typed structures before reaching the frontend.

---

## 3. Frontend Architecture

### Existing V1 structure (preserved)

```
src/
├── components/          # 14 React components
│   ├── BranchCompare.tsx
│   ├── BranchExplorer.tsx
│   ├── CommitHistory.tsx
│   ├── CommitInspection.tsx
│   ├── ContributionGraph.tsx
│   ├── DiffViewer.tsx
│   ├── ErrorBoundary.tsx
│   ├── GlassDropdown.tsx
│   ├── Navbar.tsx
│   ├── NetworkStatusBanner.tsx
│   ├── ProfileCard.tsx
│   ├── RepoCard.tsx
│   ├── SearchBar.tsx
│   └── StatsCard.tsx
├── pages/
│   ├── Home.tsx          # Landing + search
│   └── Profile.tsx       # Repository workbench
├── services/
│   ├── githubApi.ts      # GitHub REST client + cache + DAG builder (786 lines)
│   └── security.ts       # URL/input sanitization (55 lines)
├── types/
│   └── github.ts         # 25+ TypeScript interfaces (256 lines)
├── App.tsx               # Router + ErrorBoundary + NetworkStatusBanner
├── main.tsx              # React root
└── index.css             # Design system (105,156 bytes)
```

### V2 frontend additions (planned)

- `src/services/api.ts` — GitExplore backend API client (replaces direct GitHub calls progressively)
- `src/services/auth.ts` — Authentication client
- `src/pages/Workspace.tsx` — Saved repositories, investigations, notes
- `src/components/AIOverview.tsx` — Repository AI overview panel
- `src/components/AICommitExplainer.tsx` — Commit explanation panel
- `src/components/AIDiffReview.tsx` — Diff review panel
- `src/components/AIBranchAnalysis.tsx` — Branch comparison AI panel
- `src/components/AIHealthAnalysis.tsx` — Repository health panel
- `src/components/InvestigationPanel.tsx` — Investigation creation and history
- `src/components/NotesEditor.tsx` — Notes and bookmarks
- `src/types/workspace.ts` — Workspace TypeScript interfaces
- `src/types/ai.ts` — AI response TypeScript interfaces

Frontend migration strategy: The `githubApi.ts` service is the sole source of GitHub data calls. During migration, individual functions (e.g., `fetchGithubUser`) will be redirected to call the backend API instead of GitHub directly. This allows incremental migration without breaking existing components.

---

## 4. Backend Architecture

### Proposed structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment variable validation and loading
│   │   └── database.ts         # Prisma client initialization
│   ├── routes/
│   │   ├── health.ts           # Health check endpoint
│   │   ├── github.ts           # GitHub proxy routes
│   │   ├── repositories.ts     # Repository intelligence routes
│   │   ├── ai.ts               # AI analysis routes
│   │   ├── workspace.ts        # Workspace CRUD routes
│   │   └── auth.ts             # Authentication routes
│   ├── controllers/
│   │   ├── githubController.ts
│   │   ├── repositoryController.ts
│   │   ├── aiController.ts
│   │   ├── workspaceController.ts
│   │   └── authController.ts
│   ├── services/
│   │   ├── githubService.ts    # Server-side GitHub API client
│   │   ├── cacheService.ts     # In-memory + DB result caching
│   │   └── authService.ts      # Authentication logic
│   ├── repositories/
│   │   ├── userRepository.ts
│   │   ├── savedRepoRepository.ts
│   │   ├── investigationRepository.ts
│   │   ├── noteRepository.ts
│   │   └── aiAnalysisRepository.ts
│   ├── middleware/
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── validation.ts       # Request validation middleware
│   │   ├── errorHandler.ts     # Centralized error handler
│   │   └── rateLimiter.ts      # API rate limiting
│   ├── github/
│   │   ├── client.ts           # GitHub REST API wrapper
│   │   ├── types.ts            # GitHub response types
│   │   └── normalizer.ts       # Response normalization
│   ├── intelligence/
│   │   ├── commitGraph.ts      # Commit DAG engine (server-side)
│   │   ├── statistics.ts       # Commit/contributor statistics
│   │   ├── divergence.ts       # Branch divergence analysis
│   │   ├── fileAnalysis.ts     # File-change frequency and churn
│   │   └── evolution.ts        # Repository evolution timeline
│   ├── ai/
│   │   ├── provider.ts         # AI provider interface
│   │   ├── providers/
│   │   │   └── openai.ts       # OpenAI implementation (or other)
│   │   ├── contextBuilder.ts   # Structured prompt assembly
│   │   ├── prompts/
│   │   │   ├── repositoryOverview.ts
│   │   │   ├── commitExplanation.ts
│   │   │   ├── diffReview.ts
│   │   │   ├── branchAnalysis.ts
│   │   │   └── repositoryHealth.ts
│   │   ├── schemas/
│   │   │   ├── repositoryOverview.ts
│   │   │   ├── commitExplanation.ts
│   │   │   ├── diffReview.ts
│   │   │   ├── branchAnalysis.ts
│   │   │   └── repositoryHealth.ts
│   │   └── cache.ts            # AI response caching
│   ├── types/
│   │   ├── api.ts              # API request/response types
│   │   ├── intelligence.ts     # Intelligence engine types
│   │   └── ai.ts               # AI-specific types
│   └── app.ts                  # Express app setup
├── prisma/
│   └── schema.prisma           # Database schema
├── tests/
│   ├── services/
│   ├── intelligence/
│   ├── ai/
│   └── routes/
├── package.json
├── tsconfig.json
└── .env.example
```

### Layer responsibilities:

| Layer | Responsibility |
| :--- | :--- |
| **Routes** | HTTP method binding, parameter extraction, controller dispatch |
| **Controllers** | Request validation, orchestration, response formatting |
| **Services** | Business logic, external API calls, caching coordination |
| **Repositories** | Database queries via Prisma, data access encapsulation |
| **Intelligence** | Pure deterministic analysis functions (no side effects) |
| **AI** | Provider abstraction, prompt building, schema validation, response caching |
| **Middleware** | Cross-cutting: auth, validation, errors, rate limiting |

---

## 5. Database Architecture

### Technology

- **PostgreSQL (Neon Free Plan)** — serverless cloud PostgreSQL database for structured workspace data.
- **Prisma** — type-safe ORM with migration management.

### Conceptual entities

```
User
├── id (UUID, PK)
├── githubId (unique, nullable)
├── username
├── email
├── avatarUrl
├── createdAt
└── updatedAt

SavedRepository
├── id (UUID, PK)
├── userId (FK → User)
├── owner
├── name
├── fullName
├── description
├── language
├── stars
├── forks
├── defaultBranch
├── savedAt
└── updatedAt

Investigation
├── id (UUID, PK)
├── userId (FK → User)
├── repositoryId (FK → SavedRepository)
├── title
├── description
├── context (JSON — branch, commit, comparison metadata)
├── createdAt
└── updatedAt

Note
├── id (UUID, PK)
├── userId (FK → User)
├── investigationId (FK → Investigation, nullable)
├── repositoryId (FK → SavedRepository, nullable)
├── targetType (enum: commit, branch, diff, repository)
├── targetRef (string — SHA, branch name, etc.)
├── content (text)
├── createdAt
└── updatedAt

Bookmark
├── id (UUID, PK)
├── userId (FK → User)
├── repositoryId (FK → SavedRepository)
├── targetType (enum: commit, branch, file, comparison)
├── targetRef
├── label
├── createdAt

Tag
├── id (UUID, PK)
├── userId (FK → User)
├── name
├── color

RepositoryTag (join table)
├── repositoryId (FK → SavedRepository)
├── tagId (FK → Tag)

AIAnalysis
├── id (UUID, PK)
├── repositoryId (FK → SavedRepository, nullable)
├── analysisType (enum: overview, commit, diff, branch, health)
├── contextHash (string — fingerprint of input data)
├── prompt (text)
├── response (JSON — validated AI output)
├── provider (string)
├── modelId (string)
├── tokenUsage (JSON)
├── createdAt
├── expiresAt
```

### Design principles:

- GitHub API responses are **not** bulk-stored in the database. The database stores workspace entities (what the user saved, investigated, noted) and cached AI analyses.
- Repository metadata in `SavedRepository` is a snapshot at save time, not a live mirror.
- `contextHash` in `AIAnalysis` enables cache lookups: if the same input data produces the same hash, the cached result is returned.

---

## 6. GitHub Integration Flow

### Current V1 flow (direct)

```
Frontend (githubApi.ts)
  → fetch(https://api.github.com/...)
  → parse + validate response
  → cache in browser memory
  → render
```

### V2 flow (server-proxied)

```
Frontend (api.ts)
  → fetch(/api/github/users/:username)
  → Backend (githubService.ts)
  → fetch(https://api.github.com/...) with server-side token
  → normalize response
  → cache on server
  → return to frontend
  → render
```

### Why move GitHub calls server-side:

1. **Token security.** GitHub Personal Access Tokens must never be in client-side JavaScript. Server-side storage keeps them out of browser DevTools, network tabs, and source bundles.
2. **Rate limits.** Unauthenticated: 60 req/hr per IP. Authenticated: 5,000 req/hr per token. The backend uses a single token for all users.
3. **Response shaping.** The backend can normalize, filter, and enrich GitHub responses before they reach the frontend, reducing client-side processing.
4. **Caching.** Server-side caching serves multiple concurrent users from one cache entry instead of each browser maintaining its own cache.

### Migration strategy:

- Phase 1: Backend GitHub endpoints mirror the same data shapes the frontend currently expects.
- Phase 2: Frontend `githubApi.ts` functions are updated to call `/api/github/*` instead of `api.github.com`.
- Phase 3: V1 direct calls are removed after validation.

---

## 7. Repository Intelligence Engine

The intelligence engine computes deterministic analysis from GitHub data. It runs on the backend and its outputs serve two purposes:

1. Direct display in the frontend (statistics, graphs, metrics).
2. Input to the AI context builder (evidence for AI interpretation).

### Analysis capabilities:

| Analysis | Input | Output |
| :--- | :--- | :--- |
| **Commit DAG** | Commit list with parents | Directed acyclic graph with nodes, edges, root/head/merge detection |
| **Commit statistics** | Commit list | Total commits, commit frequency, average additions/deletions per commit |
| **Branch divergence** | Two branch refs | Ahead/behind counts, divergence point, commit delta |
| **File-change analysis** | Commit diffs | Most-changed files, file churn frequency, additions/deletions per file |
| **Contributor activity** | Commit/event data | Per-author commit counts, active periods, contribution distribution |
| **Repository evolution** | Commits over time | Activity timeline, quiet/active periods, growth trajectory |

### Design:

- Intelligence functions are **pure**: they take data in and return analysis out. No side effects, no database calls, no network calls.
- The `buildCommitRelationshipModel` function in `githubApi.ts` (lines 375–483) is the existing V1 DAG engine. The server-side version will use the same algorithm.

---

## 8. AI Architecture

### Data flow:

```
GitHub data (fetched by githubService)
  → deterministic analysis (intelligence engine)
  → context builder (assembles structured prompt)
  → prompt template (versioned, per-analysis-type)
  → AI provider (sends to LLM, receives raw response)
  → schema validation (Zod or equivalent)
  → caching (store by contextHash)
  → typed response to frontend
```

### Provider abstraction:

```typescript
interface AIProvider {
  readonly name: string;
  analyze(request: AIAnalysisRequest): Promise<AIRawResponse>;
}

interface AIAnalysisRequest {
  type: AnalysisType;
  context: Record<string, unknown>;
  prompt: string;
  responseSchema: ZodSchema;
  maxTokens?: number;
}

interface AIRawResponse {
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  model: string;
  provider: string;
}
```

### Context builder:

Each analysis type has a context builder function that:

1. Accepts intelligence engine output.
2. Selects relevant data fields.
3. Truncates large payloads to fit within token limits.
4. Returns a structured context object and formatted prompt string.

### Prompt versioning:

Prompts are stored as named, versioned template functions. When a prompt changes, the version increments, which invalidates cached results for that analysis type.

### Response validation:

Every AI response is parsed and validated against a typed Zod schema. If validation fails, the response is rejected and the user sees a fallback message — not a broken UI.

### Caching strategy:

- Each analysis request produces a `contextHash` (deterministic hash of the input data).
- Before calling the AI provider, the system checks `AIAnalysis` table for a matching `contextHash` that has not expired.
- Cache TTLs are per-analysis-type (e.g., repository overview: 24 hours; commit explanation: 7 days).

### Error handling:

- AI provider timeout → return error with "AI unavailable" message.
- AI provider returns invalid schema → return error with "AI response could not be processed."
- AI provider returns empty → return error with fallback.
- All deterministic analysis remains available regardless of AI status.

---

## 9. AI Feature Architecture

### 9.1 Repository Overview

**Context:** Repository metadata, language breakdown, recent commit summary, contributor count, star/fork counts, last activity date.

**Output schema:** `{ purpose: string, techStack: string[], activityLevel: string, maintenanceAssessment: string, notablePatterns: string[] }`

### 9.2 Commit Explanation

**Context:** Commit message, author, date, parent SHAs, changed files list, patch content (truncated to token limit).

**Output schema:** `{ summary: string, motivation: string, changes: { file: string, description: string }[], risks: string[], complexity: 'low' | 'medium' | 'high' }`

### 9.3 Diff Review

**Context:** File diffs with additions/deletions, file names, patch hunks.

**Output schema:** `{ observations: { file: string, observation: string, severity: 'info' | 'warning' | 'critical', category: string }[], overallAssessment: string }`

### 9.4 Branch Analysis

**Context:** Base/head branch names, ahead/behind counts, commit delta summary, changed files summary.

**Output schema:** `{ divergenceSummary: string, notableChanges: string[], mergeRisk: 'low' | 'medium' | 'high', recommendations: string[] }`

### 9.5 Repository Health

**Context:** Commit frequency over time, last commit date, open issues count, contributor count, release frequency, branch count.

**Output schema:** `{ healthScore: string, activityAssessment: string, maintenanceSignals: string[], risks: string[], recommendations: string[] }`

---

## 10. API Architecture

### Initial API design (subject to refinement during implementation)

```
Health
  GET  /api/health

GitHub Proxy
  GET  /api/github/users/:username
  GET  /api/github/users/:username/repos
  GET  /api/github/repos/:owner/:repo
  GET  /api/github/repos/:owner/:repo/branches
  GET  /api/github/repos/:owner/:repo/commits
  GET  /api/github/repos/:owner/:repo/commits/:sha
  GET  /api/github/repos/:owner/:repo/compare/:base...:head
  GET  /api/github/users/:username/events

Repository Intelligence
  GET  /api/repositories/:owner/:repo/analysis
  POST /api/repositories/:owner/:repo/analyze

AI Analysis
  POST /api/ai/repository-overview
  POST /api/ai/commit-explanation
  POST /api/ai/diff-review
  POST /api/ai/branch-analysis
  POST /api/ai/repository-health

Authentication
  POST /api/auth/login
  POST /api/auth/register
  POST /api/auth/logout
  GET  /api/auth/me

Workspace
  GET  /api/workspace
  GET  /api/workspace/repositories
  POST /api/workspace/repositories
  DELETE /api/workspace/repositories/:id

Investigations
  GET  /api/investigations
  POST /api/investigations
  GET  /api/investigations/:id
  PUT  /api/investigations/:id
  DELETE /api/investigations/:id

Notes
  GET  /api/notes
  POST /api/notes
  PUT  /api/notes/:id
  DELETE /api/notes/:id

Bookmarks
  GET  /api/bookmarks
  POST /api/bookmarks
  DELETE /api/bookmarks/:id
```

These are initial API designs. They will be refined during implementation as requirements solidify.

---

## 11. Security Architecture

### Server-side secrets

| Secret | Storage | Access |
| :--- | :--- | :--- |
| GitHub Personal Access Token | Backend `.env` | `githubService.ts` only |
| AI provider API key | Backend `.env` | `ai/provider.ts` only |
| Database connection string | Backend `.env` | Prisma client only |
| Session/JWT secret | Backend `.env` | Auth middleware only |

None of these values are ever sent to the frontend or included in client-side bundles.

### Authentication & authorization

- Session-based or JWT-based authentication (UNDECIDED — to be resolved during implementation).
- Workspace endpoints require authentication.
- GitHub proxy and AI endpoints may be used without authentication with rate limiting, or require authentication (UNDECIDED).
- Authorization: users can only access their own workspace data.

### Input validation

- All API inputs validated with a schema validation library (Zod or equivalent).
- GitHub usernames sanitized (alphanumeric + hyphens, max 39 chars — existing `sanitizeUsername` pattern).
- Free-text inputs (notes, investigation descriptions) sanitized for control characters.

### Rate limiting

- Backend rate limits on AI endpoints (expensive external calls).
- Backend rate limits on GitHub proxy endpoints (protects the server-side token).
- Frontend retains existing rate-limit tracking UI for user feedback.

### CORS

- Backend configures CORS to allow only the GitExplore frontend origin.

### AI-specific security

- AI prompts never include raw user credentials or tokens.
- AI context payloads are size-limited to prevent token abuse.
- AI responses are validated before storage or display.

---

## 12. Deployment Architecture

### V1 (current production)

```
main branch
  → Vercel auto-deploy
  → Static SPA (index.html + JS/CSS bundle)
  → vercel.json SPA rewrites
```

### V2 (development)

```
v2-fullstack branch
  → Vercel Preview (frontend service)
  → Vercel Services (backend service)
  → PostgreSQL (Neon Free Plan)
```

### V2 (production target)

```
v2-fullstack
  → full validation pass
  → merge to main
  → Vercel Production (frontend service)
  → Vercel Services (backend production deployment)
  → PostgreSQL production database (Neon Free Plan)
```

### Environment configuration

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `AI_PROVIDER_KEY` | AI provider API key |
| `AI_PROVIDER` | AI provider name (e.g., `openai`) |
| `AI_MODEL` | AI model identifier |
| `SESSION_SECRET` | Authentication secret |
| `FRONTEND_URL` | Allowed CORS origin |
| `NODE_ENV` | `development` / `production` |

---

## 13. Complete V2 Folder Structure

```
gitexplore/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── github/
│   │   ├── intelligence/
│   │   ├── ai/
│   │   │   ├── providers/
│   │   │   ├── prompts/
│   │   │   └── schemas/
│   │   ├── types/
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── TASK.md
│   └── MEMORY.md
├── public/
├── src/                          # Existing V1 frontend
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── AGENTS.md
├── PROJECT_HANDOFF.md
├── README.md
├── skills.md
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```
