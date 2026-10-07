# GitExplore V2 — Project Memory

This document is the persistent memory for AI agents and developers working on GitExplore. A new agent should be able to read this file and understand the project's current state, decisions, and constraints without reading the entire codebase.

---

## Project Identity

**GitExplore** — Git Repository Intelligence & Management Platform

A developer workbench for exploring, analyzing, investigating, and understanding Git repositories. Centralizes GitHub profiles, repositories, branches, commits, DAG relationships, code diffs, branch comparisons, contribution calendars, and activity feeds into a single workspace.

---

## Current State

### V1 — Completed, Production, Frontend-Only

- **Status:** IMPLEMENTED, DEPLOYED
- **Branch:** `main`
- **Hosting:** Vercel (static SPA deployment)
- **URL:** Production on Vercel (SPA with `vercel.json` rewrites)
- **Stack:** React 19, TypeScript 5 (strict), Vite 6, React Router DOM 7, Framer Motion, Lucide React, native Fetch API, handcrafted CSS
- **Backend:** None
- **Database:** None
- **Authentication:** None
- **AI:** None

### V2 — Planned, In Documentation Phase

- **Status:** PLANNED (documentation phase)
- **Branch:** `v2-fullstack`
- **Stack (planned):** Existing frontend + Node.js backend + PostgreSQL (Prisma) + AI provider abstraction
- **Backend:** PLANNED
- **Database:** PLANNED
- **Authentication:** PLANNED
- **AI:** PLANNED

---

## Branch Strategy

| Branch | Purpose | Status |
| :--- | :--- | :--- |
| `main` | V1 production | Active, deployed on Vercel |
| `v2-fullstack` | V2 development | Active, current working branch |

**Rule:** Never develop V2 features on `main`. Never force-push `main`. Never auto-merge `v2-fullstack` to `main`.

---

## V1 Verified Capabilities

The following capabilities are **IMPLEMENTED and verified** in the V1 codebase on the `main` branch:

### Profile & Search
- Username search with validation (empty-input prevention, Enter-key submission)
- Client-side routing to `/profile/:username`
- Real GitHub profile data display (avatar, login, name, bio, company, location, blog, followers, following, repos, join date)
- Profile loading skeletons, 404 not-found state, network error state, retry capability

### Repository Explorer
- Fetches first 100 public repositories per user (`per_page=100&sort=updated`)
- Repository cards with name, description, language, stars, forks, open issues, visibility, last updated, homepage, GitHub link
- Client-side search across name, full_name, description, language
- Dynamic language dropdown generated from loaded repositories
- Multi-criteria sorting: recently updated, stars, forks, newest, name
- Incremental pagination (12 per batch, "Load More")
- Aggregate statistics (loaded repos, total stars, total forks)
- No-results state with clear-filters action

### Branch Explorer
- Fetches repository branches (`per_page=100`)
- Default branch pinning
- Protected branch badges
- Instant client-side branch search

### Commit History
- Fetches branch commits (`per_page=15` with pagination)
- Commit messages, author avatars, timestamps, SHA links
- Parent-child relationship display

### Commit DAG
- `buildCommitRelationshipModel()` in `githubApi.ts` (lines 375–483)
- Bidirectional parent ↔ child linking
- Merge commit detection (`parents.length > 1`)
- Root commit detection (`parents.length === 0` or no known parents)
- Head commit detection (`childShas.length === 0`)
- Fingerprint-based graph caching
- `getParentCommits()`, `getChildCommits()`, `getCommitNode()` graph query functions

### Commit Inspection
- Detailed commit modal (`CommitInspection.tsx`)
- Commit metadata, parent hashes, file list, additions/deletions statistics
- Interactive patch review

### Diff Viewer
- Unified (inline) and split (side-by-side) diff rendering (`DiffViewer.tsx`)
- Syntax-aware line highlighting (additions, deletions, context)
- Chunked rendering for large diffs

### Branch Comparison
- Branch-to-branch comparison (`BranchCompare.tsx`)
- Ahead/behind counts
- Commit delta log
- Cumulative changed-file diffs

### Contribution Calendar
- Full 12-month, 365-day calendar matrix (`ContributionGraph.tsx`)
- External contribution API (`github-contributions-api.jogruber.de`) with fallback
- 5-level intensity coloring (0–4)
- Rolling 72-hour event feed with category filtering (Pushes, PRs, Issues, Creates, Stars/Forks)
- Expandable commit details in event feed

### Caching & Performance
- In-memory API response cache with tuned TTLs (1min–15min per resource type)
- In-flight request deduplication (promise sharing)
- Max 250 cache entries with LRU eviction
- DAG graph model cache (50 entries max)
- Parsed patch memoization

### Rate Limiting
- `x-ratelimit-*` header parsing
- Client-side rate-limit block (prevents requests when remaining = 0)
- Rate-limit error class with reset date
- UI countdown banner

### Error Handling
- React Error Boundary (`ErrorBoundary.tsx`) with diagnostic logging and recovery actions
- `GithubApiError` class with typed error kinds: `not-found`, `rate-limit`, `network`, `unexpected`, `empty`
- Contextual in-UI error banners with retry (no `alert()`)

### Network Status
- `NetworkStatusBanner.tsx` monitors `online`/`offline` events
- Persistent amber warning banner when offline

### Security
- `sanitizeUrl()` — protocol whitelist (`http:`, `https:`), blocks `javascript:`, `data:`, `vbscript:`
- `sanitizeText()` — strips control characters
- `sanitizeUsername()` — alphanumeric + hyphens, max 39 chars
- External links use `rel="noopener noreferrer"`

### CI/CD
- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Triggered on push/PR to `main`
- Node.js 20, `npm ci`, `npm run build` (tsc + vite)

### Design System
- Handcrafted CSS in `src/index.css` (105 KB)
- Light frosted material theme (overrides earlier dark foundation)
- Frosted glass surfaces, subtle borders, soft shadows
- Responsive breakpoints: desktop (>1024px), tablet, mobile (<680px)
- Framer Motion entrance animations
- Lucide React vector icons
- Accessible `:focus-visible` rings

### Files & Sizes
- `src/services/githubApi.ts` — 786 lines, 26,619 bytes (largest source file)
- `src/index.css` — 105,156 bytes
- `src/pages/Profile.tsx` — 503 lines, 21,926 bytes
- `src/types/github.ts` — 256 lines, 25+ interfaces
- 14 components, 2 pages, 2 services, 1 type file

---

## V2 Direction

### Architecture
- Frontend: Existing React app (preserved)
- Backend: Node.js + TypeScript + Express REST API
- Database: PostgreSQL + Prisma ORM
- AI: Provider abstraction layer with structured prompts, schema validation, and caching
- GitHub: Server-side token-authenticated requests (5,000 req/hr)

### Key additions over V1
1. Server-side GitHub proxy (token security, higher rate limits, server caching)
2. Persistent user workspace (saved repos, investigations, notes, bookmarks, tags)
3. Repository intelligence engine (server-side DAG, statistics, divergence, file analysis, evolution)
4. AI analysis layer (repository overview, commit explanation, diff review, branch analysis, health)
5. Repository Q&A (natural-language questions answered with evidence)

See `docs/PRD.md` for full product requirements and `docs/ARCHITECTURE.md` for system design.

---

## Product Principles

1. **Real problem first.** Every feature solves a documented developer problem.
2. **Engineering over decoration.** Functionality and correctness before visual polish.
3. **Deterministic Git intelligence.** DAGs, statistics, and divergence are computed deterministically. They do not depend on AI.
4. **AI as interpretation layer.** AI receives structured evidence and interprets it. AI does not invent repository facts.
5. **Simple architecture.** One frontend, one backend, one database. No unnecessary infrastructure.
6. **Preserve existing functionality.** V1 is production software. Do not break it.

---

## Important Technical Decisions

### DECIDED

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| V2 development branch | `v2-fullstack` | Isolates V2 work from production `main` |
| Frontend framework | React 19 (existing) | V1 is already built and working |
| Build tool | Vite 6 (existing) | V1 is already configured |
| CSS approach | Handcrafted CSS (existing) | No migration to Tailwind or CSS modules |
| Backend language | TypeScript (strict) | Type consistency with frontend |
| Backend framework | Express 4 | Minimal, standard, reliable middleware ecosystem, strict TypeScript compatibility |
| Database | PostgreSQL (Neon Free Plan) | Cloud serverless PostgreSQL provider with fast branching, high availability, and generous free tier |
| ORM | Prisma | Type-safe, migration support, TypeScript integration |
| Backend hosting | Vercel Services | Unified fullstack deployment with Vite frontend service + Express backend service |
| Backend test runner | Vitest | Fast, native ESM/TypeScript execution, Vite ecosystem alignment |
| HTTP client for GitHub | Native Fetch (server-side) | Same approach as V1 frontend, no Axios |
| API data validation | Type guard functions (existing pattern) | V1 uses runtime type guards for all GitHub responses |
| Frontend routing | React Router DOM 7 (existing) | Already configured |
| Authentication method | HMAC-SHA256 JWT with salted scrypt hashing | Stateless Bearer tokens ideal for serverless/Vercel scaling, standard expiration and in-memory revocation |
| AI Provider | Google Gemini API | Access via Google AI Studio, Free Tier, low latency, high token allowance, strict JSON schema mode |
| AI Model | Gemini Flash-class model | High performance, fast inference, optimized for code reasoning and JSON payload output |
| AI Secret Key | `GEMINI_API_KEY` | Server-side only environment variable in backend `.env` |
| AI Architecture | `AIProvider` abstraction boundary | Strict interface separating business logic from vendor SDK, enabling zero-friction provider replacement |
| AI Response Validation | Zod schema validation | Every AI output is parsed and verified against strict schemas before caching or returning |
| AI Endpoint Access | Public with DB caching & rate limits | Allows instant repository exploration without forced login walls while supporting user workspace association |

### UNDECIDED

| Decision | Options | Notes |
| :--- | :--- | :--- |
| (None currently) | — | All architectural decisions through Day 6 have been decided and verified |

---

## Current Task

```
Current Day:    9 (In Progress)
Current Push:   1 (D9-P1: Backend Tests)
Current Objective: Unit and integration tests for all backend services, controllers, routes, and middleware
Current Status: Completed
Next Task:      D9-P2: Repository Intelligence Tests (Unit tests for all intelligence engine functions with known inputs)
```







---

## Known Constraints

- V1 must remain safe and recoverable on `main` at all times
- No production changes during V2 development on `v2-fullstack`
- No unnecessary infrastructure (no Redis, no queues, no microservices, no Kubernetes unless justified)
- No exposed secrets in committed files or client-side bundles
- No undocumented architecture changes
- GitHub unauthenticated rate limit: 60 req/hr per IP (V1 constraint)
- GitHub authenticated rate limit: 5,000 req/hr per token (V2 improvement)
- V1 only fetches first 100 repositories per user (GitHub API per_page limit)
- V1 contribution calendar depends on third-party proxy API (`github-contributions-api.jogruber.de`)
- The `.gitignore` excludes `AGENTS.md`, `skills.md`, and `PROJECT_HANDOFF.md` from the repository (they exist locally but are not committed)

---

## Completed Decisions Log

| Date | Decision | Context |
| :--- | :--- | :--- |
| 2026-09-28 | V2 documentation system created in `docs/` | 5 documents: PRD, Architecture, Rules, Task, Memory |
| 2026-09-28 | 60-milestone roadmap defined (10 days × 6 pushes) | Covers foundation through production deployment |
| 2026-09-28 | V1 baseline verified on `v2-fullstack` branch | Build passes, working tree clean (except `.planning/`), all 14 components + 2 pages verified |
| 2026-09-28 | Selected Express 4 as V2 backend framework | Strict TypeScript, minimal footprint, standard middleware architecture |
| 2026-09-28 | Configured Prisma ORM with PostgreSQL datasource | Singleton client in `src/config/database.ts` with ping & disconnect helpers |
| 2026-09-28 | Defined Core Persistence Schema in Prisma | `User` and `SavedRepository` models with cascade delete and indexing |
| 2026-09-28 | Defined Workspace Entities & Enums in Prisma | `Investigation`, `Note`, `Bookmark`, `Tag`, `RepositoryTag`, `AIAnalysis` with cascade & index rules |
| 2026-09-28 | Generated Initial PostgreSQL Migration | Migration SQL in `prisma/migrations/20260928000000_init/migration.sql` with health check utility |
| 2026-09-28 | Implemented Repository Data Access Layer | `userRepository` and `savedRepoRepository` with typed CRUD operations |
| 2026-09-29 | Configured Vitest as Backend Test Runner | Fast ESM-native testing with mocked Prisma client suites for all repository operations |
| 2026-09-29 | Created Server-Side GitHub Client & Normalizer | Bearer token auth, rate-limit header parsing, in-flight deduplication, and in-memory TTL cache |
| 2026-09-29 | Implemented Validated Profile Proxy Route | `GET /api/github/users/:username` mounted with schema validation and error handling |
| 2026-09-29 | Implemented Validated Repository Listing Route | `GET /api/github/users/:username/repos` supporting pagination, sorting, and field validation |
| 2026-09-29 | Implemented Validated Repository Branches Route | `GET /api/github/repos/:owner/:repo/branches` supporting owner/repo validation and branch list |
| 2026-09-29 | Implemented Validated Commit & Compare Routes | Added `GET /api/github/repos/:owner/:repo/commits`, `GET .../commits/:sha`, and `GET .../compare/:basehead` |
| 2026-09-29 | Migrated Frontend Profile Service to Backend Proxy | Created `src/services/api.ts` and routed `fetchGithubUser` through backend API with error mapping |
| 2026-10-01 | Locked Neon PostgreSQL (Free Plan) with Prisma ORM as official database provider | Removed undecided provider references; database creation and DATABASE_URL deferred |
| 2026-10-01 | Implemented Server-Side Commit Graph Engine (D4-P1) | Ported deterministic DAG builder to backend intelligence engine with strict typing and caching |
| 2026-10-01 | Implemented Commit Statistics Engine (D4-P2) | Deterministic frequency, change stats, and timeline distributions |
| 2026-10-01 | Implemented Branch Divergence Engine (D4-P3) | Deterministic ahead/behind, merge base, and author/file commit delta summary |
| 2026-10-01 | Implemented File-Change Intelligence Engine (D4-P4) | File churn, hotspot detection, additions/deletions aggregation, and extension distribution |
| 2026-10-02 | Implemented Repository Evolution Engine (D4-P5) | Activity periods classification, growth trajectory patterns, and monthly timeline bucketing |
| 2026-10-02 | Implemented Intelligence API (D4-P6) | REST endpoints GET /api/repositories/:owner/:repo/analysis and POST /api/repositories/:owner/:repo/analyze with caching |
| 2026-10-02 | Implemented Authentication Foundation (D5-P1) | User registration, login, logout, salted scrypt password hashing, and JWT auth middleware |
| 2026-10-02 | Implemented User Workspace Overview (D5-P2) | GET /api/workspace endpoint returning aggregated metrics and chronological activity feed |
| 2026-10-02 | Implemented Saved Repositories API (D5-P3) | GET /api/workspace/repositories, POST save repository with duplicate prevention, DELETE saved repo |
| 2026-10-02 | Implemented Investigations CRUD API (D5-P4) | CRUD endpoints with context snapshot storage and ownership enforcement |
| 2026-10-02 | Implemented Notes and Bookmarks API (D5-P5) | CRUD endpoints for notes and bookmarks with polymorphic TargetType references and filtering |
| 2026-10-03 | Implemented Tags & Frontend Workspace Page (D5-P6) | Tag CRUD, repo tag assignment, frontend Workspace.tsx page, /workspace route, and ApiClient extensions |
| 2026-10-03 | Locked Google Gemini API (Google AI Studio Free Tier) as official AI Provider | Standardized Flash-class model, server-side GEMINI_API_KEY, AIProvider abstraction boundary, and Zod response validation |
| 2026-10-03 | Implemented AI Provider Abstraction & Gemini Provider Adapter (D6-P1) | Built `AIProvider` interface, `GeminiProvider`, `MockAIProvider`, error hierarchy, and key redaction |
| 2026-10-03 | Implemented AI Context Builders (D6-P2) | Built deterministic, bounded context builders for all 6 analysis types consuming structured repository intelligence |
| 2026-10-03 | Implemented AI Prompt System (D6-P3) | Created versioned prompt templates with grounding rules for all analysis types in `src/ai/prompts/` |
| 2026-10-03 | Implemented Structured Response Validation (D6-P4) | Added Zod validation schemas for all analysis types and `validateAIResponse` boundary |
| 2026-10-03 | Implemented AI API Foundation (D6-P6) | Created `aiRouter`, `aiController`, universal `/analyze` dispatcher, dedicated endpoints, status check, and full pipeline wiring |
| 2026-10-04 | Implemented AI Repository Overview (D7-P1) | Built prompt with strict JSON schema instructions, extended schema with purpose/techStack/notablePatterns, dynamic GitHub coordinates fetch, and 14 tests |
| 2026-10-04 | Implemented AI Commit Explainer (D7-P2) | Added JSON schema guidance to prompt, extended Zod schema with motivation/complexity/changesPerFile, dynamic commit resolution in aiController, and 17 tests |
| 2026-10-04 | Implemented AI Diff Review (D7-P3) | Added observations with severity/category to prompt and Zod schema, dynamic GitHub comparison/diff in aiController, and 17 tests |
| 2026-10-04 | Implemented AI Branch Analysis (D7-P4) | Added structured JSON output guidance to prompt, enhanced Zod schema with mergeRisk/notableChanges, dynamic GitHub comparison resolution in aiController, and 13 tests |
| 2026-10-05 | Implemented AI Repository Health (D7-P5) | Added structured health JSON prompt directives, enhanced Zod schema with healthScore/activityAssessment, dynamic GitHub telemetry fetch in aiController, and 13 tests |
| 2026-10-05 | Implemented AI UI Integration (D7-P6) | Created 5 frontend AI components, strict TypeScript types, ApiClient methods, workbench integrations (RepoCard, CommitInspection, BranchCompare), and Linear/Vercel AI styling |
| 2026-10-05 | Implemented Investigation Context Engine (D8-P1) | Built `buildRepositoryInvestigationContext`, combining graph, stats, churn, trajectory, divergence, and bounded recent commits with token limits and estimation utility |
| 2026-10-05 | Implemented Repository Q&A API (D8-P2) | Added `POST /api/ai/repository-qa` (and `/api/ai/qa` alias), `sanitizeUserQuestion` sanitization, dynamic GitHub coordinates telemetry resolution, schema validation, and 22 tests |
| 2026-10-05 | Implemented Repository Q&A UI (D8-P3) | Created `RepositoryQA.tsx`, integrated into Profile toolbar modal & RepoCard tabs, added `askRepositoryQA` to `api.ts`, and verified via real browser testing |
| 2026-10-06 | Implemented Evidence References (D8-P4) | Added `supportingEvidence` to all AI prompts and Zod schemas, created `EvidenceReference.tsx`, made commit SHAs, file paths, and branch names clickable links across all AI views, and added dedicated badge CSS |
| 2026-10-06 | Implemented AI Investigation History (D8-P5) | Added `POST /api/investigations/:id/analyses` & `GET /api/investigations/:id/analyses` endpoints, created Investigations & AI History workspace tab, interactive investigation creation, and AI report inspection |
| 2026-10-07 | Implemented AI Failure and Error Hardening (D8-P6) | Standardized timeout handling, exponential backoff retries, sliding window rate limiting, and graceful fallback UX |
| 2026-10-07 | Comprehensive Backend Testing Suite (D9-P1) | Built 39 test files with 421 tests covering middleware (auth, errors, validation, rateLimiter), routes (health, auth, github, repos, workspace, ai), and services |

---

## Change Log

| Date | Change | Impact |
| :--- | :--- | :--- |
| 2026-09-28 | Created `docs/PRD.md` | V2 product requirements documented |
| 2026-09-28 | Created `docs/ARCHITECTURE.md` | V2 system architecture documented |
| 2026-09-28 | Created `docs/RULES.md` | Engineering constraints codified |
| 2026-09-28 | Created `docs/TASK.md` | 60-milestone execution roadmap created |
| 2026-09-28 | Created `docs/MEMORY.md` | Persistent project memory initialized |
| 2026-09-28 | Initialized `backend/` skeleton (D1-P3) | Express, TypeScript strict, `GET /api/health` tested |
| 2026-09-28 | Added API infrastructure (D1-P4) | Centralized error handler, request validation middleware, AppError hierarchy |
| 2026-09-28 | Extended CI workflow (D1-P5) | Parallel frontend and backend build/typecheck jobs in `.github/workflows/ci.yml` |
| 2026-09-28 | Completed Day 1 audit (D1-P6) | All 6 milestones verified green across frontend, backend, CI, and docs |
| 2026-09-28 | Completed Prisma setup (D2-P1) | Initialized `backend/prisma/schema.prisma` and `backend/src/config/database.ts` |
| 2026-09-28 | Completed Core Persistence Schema (D2-P2) | Added `User` and `SavedRepository` models with validation and client generation |
| 2026-09-28 | Completed Workspace Entities Schema (D2-P3) | Added `Investigation`, `Note`, `Bookmark`, `Tag`, `RepositoryTag`, `AIAnalysis` models and enums |
| 2026-09-28 | Completed Database Migrations & Service (D2-P4) | Generated initial migration SQL, lockfile, and enhanced database health verification |
| 2026-09-28 | Implemented Repository Persistence API (D2-P5) | Created `userRepository.ts` and `savedRepoRepository.ts` with strict types |
| 2026-09-29 | Completed Database Tests (D2-P6) | Configured Vitest, added 12 unit tests across `userRepository` and `savedRepoRepository`, updated CI |
| 2026-09-29 | Implemented GitHub Service (D3-P1) | Created `GithubClient`, response normalizers, types, and comprehensive Vitest test suite |
| 2026-09-29 | Implemented Profile API (D3-P2) | Added `GET /api/github/users/:username`, controller, supertest route tests, and app mounting |
| 2026-09-29 | Implemented Repository API (D3-P3) | Added `GET /api/github/users/:username/repos`, controller, supertest route tests, and query validation |
| 2026-09-29 | Implemented Branch API (D3-P4) | Added `GET /api/github/repos/:owner/:repo/branches`, controller, supertest route tests, and param validation |
| 2026-09-29 | Implemented Commit & Compare API (D3-P5) | Added commits list, commit detail with patches, and branch comparison endpoints with route tests |
| 2026-09-29 | First Frontend-to-Backend Migration (D3-P6) | Created `api.ts`, migrated `fetchGithubUser` to proxy through backend, configured dev server proxy |
| 2026-10-01 | Locked Neon PostgreSQL (Free Plan) database decision in docs | Updated PRD, ARCHITECTURE, RULES, TASK, and MEMORY |
| 2026-10-01 | Implemented Commit Graph Engine (D4-P1) | Added commitGraph.ts, types.ts, and Vitest test suite |
| 2026-10-01 | Implemented Commit Statistics (D4-P2) | Added statistics.ts, types in types.ts, and Vitest suite |
| 2026-10-01 | Implemented Branch Divergence (D4-P3) | Added divergence.ts, types in types.ts, and Vitest suite |
| 2026-10-01 | Implemented File-Change Intelligence (D4-P4) | Added fileAnalysis.ts, types in types.ts, and Vitest suite |
| 2026-10-02 | Implemented Repository Evolution (D4-P5) | Added evolution.ts, types in types.ts, and Vitest suite |
| 2026-10-02 | Implemented Intelligence API (D4-P6) | Added repositoriesRouter, repositoryController, analysis caching, and route tests |
| 2026-10-02 | Implemented Authentication Foundation (D5-P1) | Added authRouter, authController, authService, scrypt hashing, JWT tokens, and route protection |
| 2026-10-02 | Implemented User Workspace Overview (D5-P2) | Added workspaceRouter, workspaceController, aggregate metrics, and activity feed |
| 2026-10-02 | Implemented Saved Repositories API (D5-P3) | Added saved repositories list, save, and delete handlers with duplicate checks and auth |
| 2026-10-02 | Implemented Investigations CRUD API (D5-P4) | Added investigationsRouter, investigationController, investigationRepository, context JSON snapshot |
| 2026-10-02 | Implemented Notes and Bookmarks API (D5-P5) | Added notesRouter, bookmarksRouter, controllers, repositories, TargetType support, and 45 new tests |
| 2026-10-03 | Implemented Tags & Frontend Workspace (D5-P6) | Added Tag CRUD, tag assignments, Workspace page, /workspace route, and ApiClient workspace methods |
| 2026-10-03 | Implemented AI Provider Abstraction (D6-P1) | Added `AIProvider` interface, `GeminiProvider` adapter, `MockAIProvider`, test suite, and env handling |
| 2026-10-03 | Implemented AI Context Builders (D6-P2) | Added `contextBuilder.ts`, analysis-specific context constructors, token safety bounds, and 14 tests |
| 2026-10-03 | Implemented AI Prompt System (D6-P3) | Added versioned prompt modules in `backend/src/ai/prompts/`, grounding rules, resolver, and 9 tests |
| 2026-10-03 | Implemented Structured Response Validation (D6-P4) | Added Zod validation schemas in `backend/src/ai/schemas/`, markdown fence sanitization, and 18 tests |
| 2026-10-03 | Implemented AI Caching (D6-P5) | Added `cache.ts`, `aiAnalysisRepository.ts`, deterministic SHA-256 context hashing, and 19 new tests |
| 2026-10-03 | Implemented AI API Foundation (D6-P6) | Added `ai.ts` routes, `aiController.ts`, universal pipeline orchestrator, dedicated endpoints, status check, and 17 tests |
| 2026-10-04 | Implemented AI Repository Overview (D7-P1) | Enhanced repositoryOverview prompt and schema, updated aiController with dynamic repo fetch, and added 14 new tests |
| 2026-10-04 | Implemented AI Commit Explainer (D7-P2) | Enhanced commit explanation prompt and schema, updated aiController with dynamic commit fetch, and added 17 new tests |
| 2026-10-04 | Implemented AI Diff Review (D7-P3) | Enhanced diffReview prompt and schema, updated aiController with dynamic comparison/commit fetch, and added 17 new tests |
| 2026-10-04 | Implemented AI Branch Analysis (D7-P4) | Enhanced branchAnalysis prompt and schema, updated aiController with dynamic GitHub branch comparison fetch, and added 13 new tests |
| 2026-10-05 | Implemented AI Repository Health (D7-P5) | Enhanced repositoryHealth prompt and schema, updated aiController with dynamic GitHub repository telemetry fetch, and added 13 new tests |
| 2026-10-05 | Implemented AI UI Integration (D7-P6) | Created 5 frontend AI components, strict TypeScript types, ApiClient methods, workbench integrations (RepoCard, CommitInspection, BranchCompare), and Linear/Vercel AI styling |
| 2026-10-05 | Implemented Investigation Context Engine (D8-P1) | Built `buildRepositoryInvestigationContext`, combining graph, stats, churn, trajectory, divergence, and bounded recent commits with token limits and estimation utility |
| 2026-10-05 | Implemented Repository Q&A API (D8-P2) | Added `POST /api/ai/repository-qa` (and `/api/ai/qa` alias), `sanitizeUserQuestion` sanitization, dynamic GitHub coordinates telemetry resolution, schema validation, and 22 tests |
| 2026-10-05 | Implemented Repository Q&A UI (D8-P3) | Created `RepositoryQA.tsx`, integrated into Profile toolbar modal & RepoCard tabs, added `askRepositoryQA` to `api.ts`, and verified via real browser testing |
| 2026-10-06 | Implemented Evidence References (D8-P4) | Added supportingEvidence arrays to schemas & prompts, built EvidenceReference.tsx, added clickable links & badges |
| 2026-10-06 | Implemented AI Investigation History (D8-P5) | Added investigation AI analysis persistence endpoints, Investigations & AI History workspace tab, interactive cards, and inspection modals |
| 2026-10-07 | Implemented AI Failure and Error Hardening (D8-P6) | Added rate limiter middleware with standard headers, exponential backoff retry for transient failures, provider timeout support, and resilient frontend fallback states |
| 2026-10-07 | Implemented Backend Tests (D9-P1) | Added middleware unit tests, route integration tests, error handling tests, and fixed token revocation assertion; all 421 tests passing |













