# GitExplore V2 — Task Roadmap

Target: 10 days × 6 pushes per day = 60 milestones.

Each task is a single validated unit of work.

---

## Antigravity Execution Protocol

When asked to continue the project:

1. Read `docs/TASK.md`.
2. Identify the first incomplete task (status `[ ]`).
3. Read only the relevant project documentation needed for that task (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`, `docs/MEMORY.md`).
4. Use the **Required Skills** listed for that task.
5. Inspect the existing implementation before modifying it.
6. Implement only that task's defined scope.
7. Validate according to the task's **Validation** section.
8. Update task status to `[x]` only after successful validation.
9. Update `docs/MEMORY.md` when an architectural or project-state decision actually changes.
10. **Stop** after completing that task.
11. Do **NOT** automatically start the next task.
12. Do **NOT** commit.
13. Do **NOT** push.
14. Do **NOT** merge into `main`.
15. Do **NOT** rewrite or delete existing V1 functionality unless the task explicitly requires it.
16. If blocked, mark the task `[!] Blocked`, explain the blocker, and stop.
17. If requirements conflict, stop and report the conflict instead of guessing.

### Status Definitions

- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Completed — only after validation and all completion criteria pass
- `[!]` Blocked — blocker must be documented

### Git Control

All Git operations (commit, push, merge, tag) are performed **manually by the user**. Antigravity must never execute `git commit`, `git push`, `git merge`, or `git tag`.

---

## DAY 1 — V2 Foundation

---

### D1-P1 — V2 Branch and Project Audit

**Objective**
Verify the V1 production state, confirm `v2-fullstack` branch, validate a clean build, and audit the existing codebase to establish a verified baseline.

**Why**
No V2 work can begin safely without confirming that V1 is stable and the development branch is correctly configured. This audit prevents building on a broken or misidentified baseline.

**Scope**
- Run `git status`, `git branch`, `git log --oneline -5`
- Run `npm run build` (must pass `tsc -b && vite build` with zero errors)
- Read all source files in `src/`, verify component/page/service inventory
- Read `AGENTS.md`, `PROJECT_HANDOFF.md`, `README.md`, `skills.md`
- Verify `.gitignore`, `vercel.json`, `tsconfig*.json`

**Required Skills**
- `debugging-and-error-recovery` — if build fails, diagnose before proceeding

**Files / Modules**
- N/A (read-only audit, no files modified)

**Dependencies**
- None

**Implementation Guidance**
- This is a read-only audit. Do not modify any files.
- Record the exact branch name, last commit SHA, build output, and file inventory.

**Validation**
- `npm run build` exits with code 0
- Current branch is `v2-fullstack`
- Working tree status assessed and documented
- Source file inventory matches ARCHITECTURE.md / MEMORY.md expectations

**Completion Criteria**
- [x] Build passes with zero TypeScript errors
- [x] Branch confirmed as `v2-fullstack`
- [x] Working tree status documented
- [x] V1 source inventory verified (14 components, 2 pages, 2 services, 1 types file)

**Documentation Updates**
- None (audit only)

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D1-P2 — V2 Documentation Blueprint

**Objective**
Create the `docs/` planning system containing PRD, Architecture, Rules, Task, and Memory documents.

**Why**
V2 needs a coherent documentation system that defines what is being built, how, under what constraints, in what order, and what the current project state is. Without this, agents and developers operate without shared context.

**Scope**
- Create `docs/PRD.md` — product requirements, MVP, user flows, AI philosophy
- Create `docs/ARCHITECTURE.md` — system design, backend/frontend/database/AI architecture
- Create `docs/RULES.md` — mandatory engineering constraints
- Create `docs/TASK.md` — 60-milestone execution roadmap
- Create `docs/MEMORY.md` — project memory and current state

**Required Skills**
- `spec-driven-development` — structured requirements authoring
- `documentation-and-adrs` — architecture documentation and decision records
- `planning-and-task-breakdown` — roadmap structure and task decomposition

**Files / Modules**
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/RULES.md`
- `docs/TASK.md`
- `docs/MEMORY.md`

**Dependencies**
- D1-P1 (audit must be complete to document accurate V1 state)

**Implementation Guidance**
- Cross-reference PRD features with Architecture components to ensure consistency
- Never document planned V2 features as implemented
- V1 capabilities must be verified against actual codebase, not assumed from roadmaps

**Validation**
- All 5 documents exist in `docs/`
- PRD, Architecture, Rules, Task, and Memory are internally consistent
- No planned feature is described as completed
- V1 and V2 are clearly distinguished

**Completion Criteria**
- [x] `docs/PRD.md` created with MVP definition, user flows, and AI philosophy
- [x] `docs/ARCHITECTURE.md` created with system design and folder structure
- [x] `docs/RULES.md` created with all engineering constraints
- [x] `docs/TASK.md` created with 60-milestone roadmap
- [x] `docs/MEMORY.md` created with current state and decision log
- [x] Consistency audit passes (all 12 checks from initial audit)

**Documentation Updates**
- This task creates the documentation system itself

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D1-P3 — Backend Skeleton

**Objective**
Initialize the `backend/` directory with Node.js, TypeScript (strict), and a minimal HTTP framework. Create a health check endpoint at `GET /api/health`.

**Why**
The backend is the foundation for all V2 server-side work: GitHub proxy, database access, intelligence engine, and AI layer. A minimal working skeleton with health check proves the infrastructure compiles and runs.

**Scope**
- Create `backend/package.json` with TypeScript, chosen HTTP framework, and build scripts
- Create `backend/tsconfig.json` with `"strict": true`
- Create `backend/src/app.ts` — framework setup, middleware registration, route mounting
- Create `backend/src/config/env.ts` — environment variable loading and validation
- Create `backend/src/routes/health.ts` — `GET /api/health` returning `{ status: "ok" }`
- Create `backend/.env.example` — template for required environment variables

**Required Skills**
- `incremental-implementation` — build the skeleton as a minimal vertical slice
- `api-and-interface-design` — define the initial API structure and response format
- `source-driven-development` — verify framework setup against official docs
- `ponytail` — keep the skeleton minimal; do not over-engineer the initial setup

**Files / Modules**
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/routes/health.ts`
- `backend/.env.example`

**Dependencies**
- D1-P2 (documentation system must exist so Architecture.md can be referenced)

**Implementation Guidance**
- The framework choice (Express, Fastify, or Hono) is currently UNDECIDED in MEMORY.md. Make a decision, document it, and proceed.
- Use `"strict": true` in tsconfig. Zero `any`.
- Do not add database, authentication, or AI infrastructure yet.
- Health check should return `{ status: "ok", timestamp: ISO8601 }`.

**Validation**
- `cd backend && npm run build` passes with zero TypeScript errors
- `cd backend && npm start` starts the server
- `GET /api/health` returns HTTP 200 with JSON body
- `backend/tsconfig.json` has `"strict": true`

**Completion Criteria**
- [x] `backend/` directory created with valid `package.json` and `tsconfig.json`
- [x] `app.ts` compiles and starts an HTTP server
- [x] `GET /api/health` returns 200
- [x] Environment config loads from `.env` with validation
- [x] Backend framework decision documented in `docs/MEMORY.md`

**Documentation Updates**
- Update `docs/MEMORY.md` — move backend framework from UNDECIDED to DECIDED
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D1-P4 — API Infrastructure

**Objective**
Add centralized error handling middleware, request validation middleware, CORS configuration, and a consistent error response format.

**Why**
Every subsequent API endpoint depends on consistent error formatting, input validation, and CORS. Building this infrastructure once prevents every controller from reinventing error handling.

**Scope**
- Create `backend/src/middleware/errorHandler.ts` — catches errors, returns `{ error, code, details? }`
- Create `backend/src/middleware/validation.ts` — validates request params/body against schemas
- Configure CORS in `app.ts` for the frontend origin
- Define error response types in `backend/src/types/api.ts`

**Required Skills**
- `api-and-interface-design` — error contract design, middleware architecture
- `incremental-implementation` — add middleware without breaking the health endpoint
- `source-driven-development` — verify middleware patterns against framework docs

**Files / Modules**
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/validation.ts`
- `backend/src/types/api.ts`
- `backend/src/app.ts` (update to register middleware)

**Dependencies**
- D1-P3 (backend skeleton must exist)

**Implementation Guidance**
- Error handler must be the last middleware registered (catch-all).
- Validation middleware should accept a schema and return 400 with structured errors on failure.
- CORS should allow only the configured `FRONTEND_URL` origin.
- Do not add authentication middleware yet (that's D5-P1).

**Validation**
- Backend builds with zero errors
- Sending an invalid request body returns HTTP 400 with `{ error, code }` format
- CORS headers present on responses
- Unhandled errors return HTTP 500 with structured JSON (not stack traces in production mode)

**Completion Criteria**
- [x] Error handler middleware catches and formats all unhandled errors
- [x] Validation middleware rejects invalid requests with structured 400 response
- [x] CORS configured for frontend origin
- [x] Error response type defined in `backend/src/types/api.ts`
- [x] `GET /api/health` still works after middleware registration

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D1-P5 — CI Backend Validation

**Objective**
Extend `.github/workflows/ci.yml` to build and typecheck the backend alongside the existing frontend CI checks.

**Why**
CI must catch TypeScript and build failures in both frontend and backend on every push and PR. Without this, regressions can be merged undetected.

**Scope**
- Update `.github/workflows/ci.yml` to add a backend build job or step
- Backend step: `cd backend && npm ci && npm run build`

**Required Skills**
- `ci-cd-and-automation` — CI pipeline design and GitHub Actions configuration
- `source-driven-development` — verify GitHub Actions syntax against official docs

**Files / Modules**
- `.github/workflows/ci.yml`

**Dependencies**
- D1-P3 (backend skeleton must exist with a working build command)

**Implementation Guidance**
- Either add a separate job for backend or add backend steps to the existing `validate` job.
- Use `node-version: 20` consistently.
- Backend step must install dependencies and run the build command.
- Do not add database setup to CI yet (no migrations to run until Day 2).

**Validation**
- CI workflow YAML is valid (no syntax errors)
- Both frontend and backend build steps defined
- If run locally: `cd backend && npm run build` passes

**Completion Criteria**
- [x] `.github/workflows/ci.yml` updated with backend build step
- [x] Frontend build step preserved (not broken)
- [x] Backend step runs `npm ci` and `npm run build`
- [x] CI workflow syntax is valid

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D1-P6 — Day 1 Audit

**Objective**
Verify all Day 1 deliverables. Run full builds for frontend and backend. Update project state documentation.

**Why**
Each day ends with a verification pass to confirm all milestones were met before moving to the next day. This prevents compounding errors.

**Scope**
- Run `npm run build` (frontend)
- Run `cd backend && npm run build` (backend)
- Verify `GET /api/health` returns 200
- Verify CI workflow updated
- Update `docs/MEMORY.md` — Current Day, Current Push, decision log
- Update `docs/TASK.md` — mark D1 tasks as completed only if they pass

**Required Skills**
- `code-review-and-quality` — verify all deliverables meet completion criteria
- `ponytail-review` — check for over-engineering introduced during Day 1

**Files / Modules**
- `docs/MEMORY.md`
- `docs/TASK.md`

**Dependencies**
- D1-P1 through D1-P5

**Implementation Guidance**
- This is a verification and documentation task. Do not add new features.
- If any D1 task did not meet its completion criteria, mark it `[!] Blocked` and document the issue.

**Validation**
- Frontend build passes
- Backend build passes
- Health endpoint responds
- CI workflow syntax valid
- All D1 completion criteria reviewed

**Completion Criteria**
- [x] Frontend `npm run build` passes
- [x] Backend `npm run build` passes
- [x] `GET /api/health` returns 200
- [x] `docs/MEMORY.md` updated with Day 1 decisions and state
- [x] `docs/TASK.md` statuses accurate for all D1 tasks

**Documentation Updates**
- `docs/MEMORY.md` — update Current Task, Completed Decisions Log, Change Log
- `docs/TASK.md` — update D1 task statuses

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

## DAY 2 — Database

---

### D2-P1 — Prisma Setup

**Objective**
Install Prisma, initialize `prisma/schema.prisma` with PostgreSQL datasource, and configure `DATABASE_URL` in the environment system.

**Why**
PostgreSQL with Prisma is the persistence layer for all V2 workspace data. Setup must be validated before any models or migrations can be created.

**Scope**
- Install `prisma` and `@prisma/client` in `backend/`
- Run `npx prisma init` or manually create `backend/prisma/schema.prisma`
- Configure datasource for PostgreSQL with `DATABASE_URL` from environment
- Create or update `backend/src/config/database.ts` with Prisma client initialization
- Add `DATABASE_URL` to `backend/.env.example`

**Required Skills**
- `source-driven-development` — verify Prisma setup against official Prisma docs
- `incremental-implementation` — add Prisma without modifying existing backend functionality
- `ponytail` — minimal setup; do not add models yet

**Files / Modules**
- `backend/prisma/schema.prisma`
- `backend/package.json` (dependency update)
- `backend/src/config/database.ts`
- `backend/.env.example`

**Dependencies**
- D1-P3 (backend skeleton must exist)

**Implementation Guidance**
- Do not define any models yet — that's D2-P2 and D2-P3.
- Prisma client should be a singleton exported from `database.ts`.
- `DATABASE_URL` format: `postgresql://user:password@host:port/dbname`

**Validation**
- `npx prisma validate` passes
- `npx prisma generate` produces client without errors
- Backend still builds with zero TypeScript errors
- `GET /api/health` still works

**Completion Criteria**
- [x] `backend/prisma/schema.prisma` exists with PostgreSQL datasource
- [x] `@prisma/client` and `prisma` in `backend/package.json`
- [x] `database.ts` exports a Prisma client singleton
- [x] `DATABASE_URL` in `.env.example`
- [x] `npx prisma validate` passes

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D2-P2 — Core Persistence Schema

**Objective**
Define `User` and `SavedRepository` models in the Prisma schema, matching the entity definitions in ARCHITECTURE.md.

**Why**
Users and saved repositories are the foundational entities for the workspace. All other workspace entities (investigations, notes, bookmarks) depend on these.

**Scope**
- Add `User` model: id (UUID), githubId, username, email, avatarUrl, createdAt, updatedAt
- Add `SavedRepository` model: id (UUID), userId (FK), owner, name, fullName, description, language, stars, forks, defaultBranch, savedAt, updatedAt
- Define relationship: User has many SavedRepositories

**Required Skills**
- `source-driven-development` — verify Prisma schema syntax against official docs
- `api-and-interface-design` — entity design matching ARCHITECTURE.md

**Files / Modules**
- `backend/prisma/schema.prisma`

**Dependencies**
- D2-P1 (Prisma must be initialized)

**Implementation Guidance**
- Use `@id @default(uuid())` for UUID primary keys.
- Use `@relation` for foreign keys.
- Add `@@index` on `userId` in `SavedRepository` for query performance.
- Match the entity definitions in `docs/ARCHITECTURE.md` Section 5.

**Validation**
- `npx prisma validate` passes
- Models match ARCHITECTURE.md entity definitions
- User → SavedRepository relationship defined with proper FK constraint

**Completion Criteria**
- [x] `User` model defined with all specified fields
- [x] `SavedRepository` model defined with userId FK
- [x] Relationship declared with `@relation`
- [x] `npx prisma validate` passes

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D2-P3 — Workspace Entities

**Objective**
Define `Investigation`, `Note`, `Bookmark`, `Tag`, `RepositoryTag` (join table), and `AIAnalysis` models in the Prisma schema.

**Why**
These entities complete the workspace data model, enabling persistent investigations, annotations, bookmarks, tagging, and cached AI analysis results.

**Scope**
- Add `Investigation` model with userId, repositoryId, title, description, context (JSON), timestamps
- Add `Note` model with userId, investigationId (nullable), repositoryId (nullable), targetType (enum), targetRef, content
- Add `Bookmark` model with userId, repositoryId, targetType, targetRef, label
- Add `Tag` model with userId, name, color
- Add `RepositoryTag` join table
- Add `AIAnalysis` model with repositoryId, analysisType (enum), contextHash, prompt, response (JSON), provider, modelId, tokenUsage (JSON), timestamps, expiresAt

**Required Skills**
- `source-driven-development` — verify Prisma enum and JSON field syntax
- `api-and-interface-design` — entity design matching ARCHITECTURE.md

**Files / Modules**
- `backend/prisma/schema.prisma`

**Dependencies**
- D2-P2 (User and SavedRepository must exist for FK references)

**Implementation Guidance**
- Use Prisma `enum` for `targetType` and `analysisType`.
- JSON fields (`context`, `response`, `tokenUsage`) use Prisma's `Json` type.
- `contextHash` in AIAnalysis is used for cache lookups — add `@@index` on it.
- All FK relationships must have proper `onDelete` cascade or restrict rules.

**Validation**
- `npx prisma validate` passes
- All 6 new models defined
- All FK constraints and enums valid
- Entity definitions match ARCHITECTURE.md Section 5

**Completion Criteria**
- [x] Investigation, Note, Bookmark, Tag, RepositoryTag, AIAnalysis models all defined
- [x] Enums declared for targetType and analysisType
- [x] JSON fields used for context, response, tokenUsage
- [x] FK relationships with onDelete rules
- [x] `npx prisma validate` passes

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D2-P4 — Database Migrations and Service

**Objective**
Run the initial Prisma migration, generate the Prisma client, and verify database connectivity.

**Why**
The migration creates the actual tables in PostgreSQL. Without this, the schema is just a definition file with no runtime effect.

**Scope**
- Run `npx prisma migrate dev --name init` to create the initial migration
- Verify `npx prisma generate` produces the client
- Update `backend/src/config/database.ts` with connection verification logic
- Test that the Prisma client can connect to the database

**Required Skills**
- `source-driven-development` — verify Prisma migration commands against official docs
- `debugging-and-error-recovery` — handle database connection failures

**Files / Modules**
- `backend/prisma/migrations/*` (auto-generated)
- `backend/src/config/database.ts`

**Dependencies**
- D2-P3 (all models must be defined before migration)
- A running PostgreSQL instance (local or remote)

**Implementation Guidance**
- Ensure `DATABASE_URL` in `.env` points to a valid PostgreSQL database.
- The migration is auto-generated by Prisma. Do not manually write SQL.
- Add a connection check function to `database.ts` for health check integration.

**Validation**
- Migration runs without errors
- `npx prisma generate` succeeds
- Prisma client connects to database
- Backend builds with zero TypeScript errors

**Completion Criteria**
- [x] Initial migration created and applied
- [x] Prisma client generated
- [x] Database connection verified
- [x] Backend builds successfully

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D2-P5 — Repository Persistence API

**Objective**
Create data access layer with CRUD operations for `User` and `SavedRepository` entities.

**Why**
The repository layer encapsulates database queries behind typed functions. Controllers and services call these functions instead of using Prisma directly, providing a clean separation of concerns.

**Scope**
- Create `backend/src/repositories/userRepository.ts` — findById, findByGithubId, create, update
- Create `backend/src/repositories/savedRepoRepository.ts` — findByUserId, findById, create, update, delete

**Required Skills**
- `incremental-implementation` — build repository functions one at a time
- `api-and-interface-design` — define typed function signatures and return types
- `ponytail` — keep repository functions thin; avoid unnecessary abstraction layers

**Files / Modules**
- `backend/src/repositories/userRepository.ts`
- `backend/src/repositories/savedRepoRepository.ts`

**Dependencies**
- D2-P4 (database must be migrated and client generated)

**Implementation Guidance**
- Each function should accept typed parameters and return typed Prisma model results.
- Use the Prisma client singleton from `database.ts`.
- Keep functions simple: one query per function. Do not add business logic.

**Validation**
- Backend builds with zero TypeScript errors
- Repository functions have explicit parameter and return types (no `any`)
- CRUD operations execute against the database without errors

**Completion Criteria**
- [x] `userRepository.ts` with findById, findByGithubId, create, update
- [x] `savedRepoRepository.ts` with findByUserId, findById, create, update, delete
- [x] All functions strictly typed
- [x] Backend builds successfully

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[x]`

---

### D2-P6 — Database Tests

**Objective**
Write tests for the User and SavedRepository repository layer CRUD operations.

**Why**
The repository layer is the foundation for all workspace operations. Bugs here cascade into every feature that reads or writes workspace data. Tests catch regressions early.

**Scope**
- Create `backend/tests/repositories/userRepository.test.ts`
- Create `backend/tests/repositories/savedRepoRepository.test.ts`
- Configure test runner (Vitest or Jest) in `backend/`
- Test create, read, update, delete for both entities

**Required Skills**
- `test-driven-development` — write tests that verify CRUD contracts
- `source-driven-development` — verify test runner setup against official docs

**Files / Modules**
- `backend/tests/repositories/userRepository.test.ts`
- `backend/tests/repositories/savedRepoRepository.test.ts`
- `backend/package.json` (test runner dependency and script)

**Dependencies**
- D2-P5 (repository functions must exist)

**Implementation Guidance**
- Use a test database (separate from development). Configure via `DATABASE_URL` override.
- Clean up test data after each test to avoid interference.
- Test both success paths and error paths (e.g., duplicate unique keys, FK violations).

**Validation**
- All tests pass
- Tests cover create, read, update, delete
- Test runner configured with scripts in `package.json`

**Completion Criteria**
- [ ] User repository tests: create, findById, findByGithubId, update
- [ ] SavedRepository tests: create, findByUserId, findById, update, delete
- [ ] All tests pass
- [ ] Test runner configured and runnable via `npm test`

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section, test runner decision

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 3 — GitHub Backend

---

### D3-P1 — GitHub Service

**Objective**
Create a server-side GitHub API client with token authentication, rate-limit tracking, and in-memory caching.

**Why**
Moving GitHub API calls server-side unlocks 5,000 req/hr (vs. 60 unauthenticated), keeps the token secure, and enables server-side caching shared across all users.

**Scope**
- Create `backend/src/github/client.ts` — fetch wrapper with `Authorization: Bearer` header, rate-limit header parsing, in-memory response cache
- Create `backend/src/github/types.ts` — GitHub API response type definitions
- Create `backend/src/github/normalizer.ts` — response normalization functions
- Load `GITHUB_TOKEN` from env config

**Required Skills**
- `api-and-interface-design` — GitHub client interface design
- `incremental-implementation` — build client incrementally (auth, then caching, then rate-limit tracking)
- `security-and-hardening` — ensure token is never logged or returned in responses
- `source-driven-development` — verify GitHub REST API v3 headers and auth format

**Files / Modules**
- `backend/src/github/client.ts`
- `backend/src/github/types.ts`
- `backend/src/github/normalizer.ts`
- `backend/src/config/env.ts` (add `GITHUB_TOKEN`)
- `backend/.env.example` (add `GITHUB_TOKEN`)

**Dependencies**
- D1-P4 (API infrastructure must exist for error handling)

**Implementation Guidance**
- Mirror the caching pattern from V1 `githubApi.ts` (TTL-based, in-flight deduplication).
- Parse `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset` headers.
- Never log the token value. Never include it in error responses.
- Use native `fetch` (Node.js 18+ built-in). Do not add Axios.

**Validation**
- Backend builds with zero TypeScript errors
- Client makes authenticated requests to GitHub API
- Rate-limit headers parsed correctly
- Token not exposed in logs or responses

**Completion Criteria**
- [ ] GitHub client with token authentication
- [ ] Rate-limit header parsing
- [ ] In-memory TTL cache
- [ ] Response type definitions
- [ ] Token loaded from env, never exposed
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D3-P2 — Profile API

**Objective**
Create `GET /api/github/users/:username` endpoint that proxies to the GitHub API and returns a normalized user profile.

**Why**
This is the first GitHub proxy endpoint. It replaces direct frontend-to-GitHub calls for user profiles, routing through the authenticated backend.

**Scope**
- Create/extend `backend/src/routes/github.ts` with profile route
- Create `backend/src/controllers/githubController.ts` with profileHandler
- Validate `:username` parameter
- Return normalized profile data matching the shape the frontend expects

**Required Skills**
- `api-and-interface-design` — endpoint design, response shape
- `incremental-implementation` — add one endpoint at a time

**Files / Modules**
- `backend/src/routes/github.ts`
- `backend/src/controllers/githubController.ts`
- `backend/src/app.ts` (mount route)

**Dependencies**
- D3-P1 (GitHub client must exist)

**Implementation Guidance**
- The response shape should match the V1 `GithubUser` interface so the frontend can consume it without changes.
- Return 404 with structured error for non-existent users.
- Return rate-limit error with reset time if GitHub returns 403.

**Validation**
- `GET /api/github/users/torvalds` returns profile data
- `GET /api/github/users/nonexistent-user-12345` returns 404
- Response shape matches `GithubUser` interface
- Backend builds

**Completion Criteria**
- [ ] Profile endpoint returns normalized GitHub user data
- [ ] 404 handling for non-existent users
- [ ] Rate-limit error handling
- [ ] Username parameter validated
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D3-P3 — Repository API

**Objective**
Create `GET /api/github/users/:username/repos` endpoint.

**Why**
Repository listing is the second most-used GitHub endpoint in the V1 frontend. Moving it server-side enables authenticated pagination and caching.

**Scope**
- Add repos route to `backend/src/routes/github.ts`
- Add reposHandler to `backend/src/controllers/githubController.ts`
- Support `per_page` and `sort` query parameters
- Return array of normalized repository objects

**Required Skills**
- `api-and-interface-design` — endpoint design with query parameters
- `incremental-implementation` — add to existing route file

**Files / Modules**
- `backend/src/routes/github.ts`
- `backend/src/controllers/githubController.ts`

**Dependencies**
- D3-P1 (GitHub client)

**Implementation Guidance**
- Default `per_page=100` and `sort=updated` to match V1 behavior.
- Response shape must match `GithubRepository[]` interface.

**Validation**
- Endpoint returns repository list for a valid username
- Query parameters work
- Response shape matches `GithubRepository[]`
- Backend builds

**Completion Criteria**
- [ ] Repos endpoint functional with query parameters
- [ ] Response matches GithubRepository interface
- [ ] Error handling for invalid users
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D3-P4 — Branch API

**Objective**
Create `GET /api/github/repos/:owner/:repo/branches` endpoint.

**Why**
Branch listing is required for the branch explorer, commit history, and branch comparison features.

**Scope**
- Add branches route to `backend/src/routes/github.ts`
- Add branchesHandler to `backend/src/controllers/githubController.ts`
- Return array of normalized branch objects with protection status

**Required Skills**
- `api-and-interface-design` — endpoint design
- `incremental-implementation` — extend existing routes

**Files / Modules**
- `backend/src/routes/github.ts`
- `backend/src/controllers/githubController.ts`

**Dependencies**
- D3-P1 (GitHub client)

**Implementation Guidance**
- Response shape must match `GithubBranch[]` interface.
- Default `per_page=100`.

**Validation**
- Endpoint returns branch list for a valid repo
- Protection status included
- Backend builds

**Completion Criteria**
- [ ] Branches endpoint functional
- [ ] Response matches GithubBranch interface
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D3-P5 — Commit API

**Objective**
Create commit list, commit detail, and branch comparison endpoints.

**Why**
These three endpoints power the commit history, commit inspection, diff viewer, and branch comparison features — the core of GitExplore's investigation workflow.

**Scope**
- `GET /api/github/repos/:owner/:repo/commits` — commit list with branch and pagination parameters
- `GET /api/github/repos/:owner/:repo/commits/:sha` — single commit detail with files and patches
- `GET /api/github/repos/:owner/:repo/compare/:base...:head` — branch comparison

**Required Skills**
- `api-and-interface-design` — multi-endpoint design with different parameter patterns
- `incremental-implementation` — add three related endpoints

**Files / Modules**
- `backend/src/routes/github.ts`
- `backend/src/controllers/githubController.ts`

**Dependencies**
- D3-P1 (GitHub client)

**Implementation Guidance**
- Commit list: support `sha` (branch), `page`, `per_page` query params.
- Commit detail: response must include `stats` and `files` with `patch` content.
- Comparison: response must include `ahead_by`, `behind_by`, `status`, `commits`, `files`.
- Response shapes must match V1 types: `GithubCommit[]`, `GithubCommitDetail`, `GithubComparisonResult`.

**Validation**
- All three endpoints return correct data for a known repository
- Commit detail includes file patches
- Comparison includes ahead/behind counts
- Backend builds

**Completion Criteria**
- [ ] Commit list endpoint with branch/pagination params
- [ ] Commit detail endpoint with stats and files
- [ ] Branch comparison endpoint with ahead/behind
- [ ] Response shapes match V1 TypeScript interfaces
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D3-P6 — First Frontend-to-Backend Migration

**Objective**
Create `src/services/api.ts` as the backend API client and migrate `fetchGithubUser` to call the backend instead of GitHub directly.

**Why**
This is the first concrete integration between frontend and backend. It proves the full request path works: frontend → backend → GitHub → backend → frontend.

**Scope**
- Create `src/services/api.ts` — typed API client with base URL configuration, error handling
- Update `fetchGithubUser` in `src/services/githubApi.ts` to call `api.ts` instead of GitHub directly
- Add environment variable or config for backend API base URL

**Required Skills**
- `deprecation-and-migration` — migrating from direct GitHub calls to backend proxy
- `incremental-implementation` — migrate one function, verify, keep all other functions unchanged
- `browser-testing-with-devtools` — verify profile search works through the backend in the browser

**Files / Modules**
- `src/services/api.ts` (new)
- `src/services/githubApi.ts` (update `fetchGithubUser` only)

**Dependencies**
- D3-P2 (backend profile endpoint must work)

**Implementation Guidance**
- Only migrate `fetchGithubUser`. Leave all other fetch functions calling GitHub directly for now.
- `api.ts` should handle the same error types as the existing `executeGithubRequest` function.
- Frontend should be configurable to point to either `localhost:PORT` (dev) or a deployed backend URL.
- The response shape must remain unchanged so `Profile.tsx` continues working without modification.

**Validation**
- Frontend builds with zero TypeScript errors (`npm run build`)
- Profile search works through the backend (visible in browser network tab)
- Existing repository, branch, commit features still work (they still call GitHub directly)
- No V1 functionality broken

**Browser Testing Required:** Yes — verify profile search end-to-end in browser

**Completion Criteria**
- [ ] `src/services/api.ts` created with typed backend API client
- [ ] `fetchGithubUser` migrated to use backend API
- [ ] Profile search works through backend
- [ ] All other features still work via direct GitHub calls
- [ ] Frontend builds with zero errors

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section, first migration milestone

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 4 — Git Intelligence

---

### D4-P1 — Commit Graph Engine

**Objective**
Port the `buildCommitRelationshipModel` function to the backend intelligence engine as a server-side DAG builder.

**Why**
The commit DAG is the foundation of GitExplore's repository intelligence. Running it server-side enables caching across users and feeds into AI context builders.

**Scope**
- Create `backend/src/intelligence/commitGraph.ts`
- Port the DAG algorithm from `src/services/githubApi.ts` lines 375–483
- Include parent/child bidirectional linking, merge detection, root detection, head detection
- Add strict TypeScript types for graph nodes, edges, and the graph structure

**Required Skills**
- `incremental-implementation` — port the algorithm, verify against V1 output
- `test-driven-development` — write a test with known commit data and verify DAG output

**Files / Modules**
- `backend/src/intelligence/commitGraph.ts`
- `backend/src/intelligence/types.ts` (or within commitGraph)

**Dependencies**
- D3-P5 (commit data must be available from the GitHub backend)

**Implementation Guidance**
- The algorithm in `githubApi.ts` (lines 375–483) is the reference implementation.
- Port it, do not reinvent it. Maintain identical output for identical input.
- Remove browser-specific concerns (fingerprint caching can be adapted for server-side).

**Validation**
- Given the same commit array, server-side DAG output matches V1 `buildCommitRelationshipModel` output
- Merge commits correctly identified (parents.length > 1)
- Root commits correctly identified
- Backend builds

**Completion Criteria**
- [ ] `commitGraph.ts` implements the DAG algorithm
- [ ] Output matches V1 for identical input
- [ ] Strict TypeScript types for all graph structures
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D4-P2 — Commit Statistics

**Objective**
Compute commit frequency, average additions/deletions, total commits, active days, and commit distribution over time.

**Why**
Commit statistics provide quantitative repository intelligence that is always deterministic and feeds into AI context for repository overview and health analysis.

**Scope**
- Create `backend/src/intelligence/statistics.ts`
- Functions: computeCommitFrequency, computeChangeStats, computeActiveTimeline

**Required Skills**
- `incremental-implementation` — build statistics functions one at a time
- `ponytail` — keep computations straightforward; no unnecessary abstractions

**Files / Modules**
- `backend/src/intelligence/statistics.ts`

**Dependencies**
- D3-P5 (commit data available)

**Validation**
- Statistics computed correctly for a known commit dataset
- Backend builds

**Completion Criteria**
- [ ] Commit frequency calculation
- [ ] Average additions/deletions per commit
- [ ] Active days count
- [ ] Commit distribution over time periods
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D4-P3 — Branch Divergence

**Objective**
Compute branch divergence analysis: ahead/behind counts, divergence point, and commit delta summary.

**Why**
Branch divergence is critical for branch comparison and AI branch analysis. It must be deterministic and reproducible.

**Scope**
- Create `backend/src/intelligence/divergence.ts`
- Functions: computeDivergence, summarizeCommitDelta

**Required Skills**
- `incremental-implementation` — single-file implementation
- `ponytail` — leverage GitHub comparison API data; do not recompute what GitHub provides

**Files / Modules**
- `backend/src/intelligence/divergence.ts`

**Dependencies**
- D3-P5 (comparison endpoint available)

**Validation**
- Divergence analysis is consistent with GitHub comparison API response
- Backend builds

**Completion Criteria**
- [ ] Ahead/behind counts computed
- [ ] Divergence point identified
- [ ] Commit delta summary generated
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D4-P4 — File-Change Intelligence

**Objective**
Compute file-change frequency, most-changed files, additions/deletions per file, and file churn metrics.

**Why**
File-change analysis reveals hotspots in the codebase — files that change frequently or accumulate large diffs. This feeds into AI repository overview and health analysis.

**Scope**
- Create `backend/src/intelligence/fileAnalysis.ts`
- Functions: computeFileChurn, findHotspotFiles, aggregateFileChanges

**Required Skills**
- `incremental-implementation` — build analysis functions
- `ponytail` — straightforward aggregation over commit file data

**Files / Modules**
- `backend/src/intelligence/fileAnalysis.ts`

**Dependencies**
- D3-P5 (commit detail with file data available)

**Validation**
- File analysis correct for known commit data
- Backend builds

**Completion Criteria**
- [ ] File-change frequency computed
- [ ] Most-changed files identified
- [ ] Additions/deletions aggregated per file
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D4-P5 — Repository Evolution

**Objective**
Compute repository evolution timeline: activity periods, growth trajectory, and commit density over time.

**Why**
Evolution analysis shows how a repository developed over its lifespan — identifying growth spurts, quiet periods, and current momentum. This is a key input for AI health analysis.

**Scope**
- Create `backend/src/intelligence/evolution.ts`
- Functions: computeEvolutionTimeline, identifyActivityPeriods, assessGrowthTrajectory

**Required Skills**
- `incremental-implementation` — build evolution functions
- `ponytail` — derive insights from commit timestamps; no complex time-series libraries

**Files / Modules**
- `backend/src/intelligence/evolution.ts`

**Dependencies**
- D4-P2 (commit statistics available for reuse)

**Validation**
- Evolution timeline generated for repositories with varying activity patterns
- Backend builds

**Completion Criteria**
- [ ] Activity period identification
- [ ] Growth trajectory assessment
- [ ] Commit density over time
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D4-P6 — Intelligence API

**Objective**
Create REST endpoints that expose the intelligence engine: `GET /api/repositories/:owner/:repo/analysis` and `POST /api/repositories/:owner/:repo/analyze`.

**Why**
The intelligence engine's output must be accessible to both the frontend (for display) and the AI layer (for context building). API endpoints provide this access.

**Scope**
- Create `backend/src/routes/repositories.ts`
- Create `backend/src/controllers/repositoryController.ts`
- GET returns cached analysis; POST triggers fresh analysis
- Combine all intelligence engine outputs into a single analysis response

**Required Skills**
- `api-and-interface-design` — endpoint design, response structure for combined analysis
- `incremental-implementation` — wire up existing engine functions

**Files / Modules**
- `backend/src/routes/repositories.ts`
- `backend/src/controllers/repositoryController.ts`
- `backend/src/app.ts` (mount route)

**Dependencies**
- D4-P1 through D4-P5 (all intelligence functions must exist)

**Implementation Guidance**
- GET should return cached results if available, or 404 if no analysis exists.
- POST should run all intelligence functions and cache the result.
- Response should include DAG summary, statistics, divergence, file analysis, and evolution.

**Validation**
- POST triggers analysis and returns results
- GET returns cached results
- Response includes all intelligence components
- Backend builds

**Completion Criteria**
- [ ] GET analysis endpoint functional
- [ ] POST analyze endpoint triggers intelligence engine
- [ ] Combined response with all analysis types
- [ ] Results cached for subsequent GET requests
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 5 — Workspace

---

### D5-P1 — Authentication Foundation

**Objective**
Implement user registration, login, logout, and session management. Create auth middleware for protecting workspace endpoints.

**Why**
Persistent workspaces require user identity. Without authentication, saved repositories, investigations, and notes cannot be attributed to a specific user.

**Scope**
- Create `backend/src/routes/auth.ts` — register, login, logout routes
- Create `backend/src/controllers/authController.ts`
- Create `backend/src/services/authService.ts` — password hashing, session/token creation
- Create `backend/src/middleware/auth.ts` — verify authentication on protected routes
- Resolve the UNDECIDED authentication method (session vs. JWT)

**Required Skills**
- `security-and-hardening` — password hashing, token security, session management
- `api-and-interface-design` — auth endpoint design
- `source-driven-development` — verify auth library usage against official docs
- `doubt-driven-development` — auth is security-critical; adversarial review of the implementation
- `documentation-and-adrs` — record the session vs. JWT decision

**Files / Modules**
- `backend/src/routes/auth.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/services/authService.ts`
- `backend/src/middleware/auth.ts`

**Dependencies**
- D2-P4 (User model and database must exist)

**Implementation Guidance**
- Decide session-based vs. JWT. Document the decision in MEMORY.md.
- Hash passwords with bcrypt or argon2. Never store plaintext.
- Auth middleware should extract user identity and attach to request context.
- Return 401 for unauthenticated requests to protected routes.

**Validation**
- Register creates a user with hashed password
- Login returns a session/token
- Logout invalidates the session/token
- Protected endpoint returns 401 without auth, 200 with auth
- Backend builds

**Completion Criteria**
- [ ] Registration endpoint creates user with hashed password
- [ ] Login endpoint returns session/token
- [ ] Logout endpoint invalidates session/token
- [ ] Auth middleware protects routes
- [ ] 401 returned for unauthenticated requests
- [ ] Auth method decision documented in MEMORY.md

**Documentation Updates**
- Update `docs/MEMORY.md` — move auth method from UNDECIDED to DECIDED, Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D5-P2 — User Workspace

**Objective**
Create `GET /api/workspace` endpoint returning the authenticated user's workspace overview.

**Why**
The workspace overview gives users a quick summary of their saved content — repo count, investigation count, recent activity — serving as the landing page for authenticated users.

**Scope**
- Create `backend/src/routes/workspace.ts`
- Create `backend/src/controllers/workspaceController.ts`
- Return: saved repos count, investigations count, recent activity summary

**Required Skills**
- `api-and-interface-design` — workspace overview response shape
- `incremental-implementation` — single endpoint

**Files / Modules**
- `backend/src/routes/workspace.ts`
- `backend/src/controllers/workspaceController.ts`
- `backend/src/app.ts` (mount route)

**Dependencies**
- D5-P1 (authentication must exist)

**Validation**
- Endpoint requires authentication
- Returns correct counts for the authenticated user
- Backend builds

**Completion Criteria**
- [ ] Workspace overview endpoint functional
- [ ] Requires authentication
- [ ] Returns accurate counts
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D5-P3 — Saved Repositories

**Objective**
Create endpoints for saving, listing, and removing repositories from a user's workspace.

**Why**
Saved repositories are the central organizing concept of the workspace. Users save repos they want to investigate, and all other workspace features (investigations, notes, bookmarks) are attached to saved repos.

**Scope**
- `GET /api/workspace/repositories` — list saved repos
- `POST /api/workspace/repositories` — save a repo
- `DELETE /api/workspace/repositories/:id` — remove a saved repo

**Required Skills**
- `api-and-interface-design` — CRUD endpoint design
- `incremental-implementation` — add endpoints to existing workspace route

**Files / Modules**
- `backend/src/routes/workspace.ts`
- `backend/src/controllers/workspaceController.ts`

**Dependencies**
- D5-P2 (workspace route and auth must exist)

**Validation**
- CRUD operations work for saved repositories
- Only the authenticated user's repos are returned
- Duplicate saves handled gracefully
- Backend builds

**Completion Criteria**
- [ ] List, save, and delete saved repositories functional
- [ ] Authorization enforced (user sees only their own repos)
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D5-P4 — Investigations

**Objective**
Create CRUD endpoints for investigations — records of what was investigated, with context snapshots.

**Why**
Investigations are the core persistence feature of GitExplore V2. They capture what a developer was looking at (branch, commit, comparison) and why, so context is preserved across sessions.

**Scope**
- Create `backend/src/routes/investigations.ts`
- Create `backend/src/repositories/investigationRepository.ts`
- CRUD: create, list (by repo), get by ID, update, delete

**Required Skills**
- `api-and-interface-design` — investigation entity API design
- `incremental-implementation` — add route and repository layer

**Files / Modules**
- `backend/src/routes/investigations.ts`
- `backend/src/controllers/investigationController.ts` (or extend workspace)
- `backend/src/repositories/investigationRepository.ts`
- `backend/src/app.ts` (mount route)

**Dependencies**
- D5-P3 (saved repositories must exist for FK relationship)

**Validation**
- CRUD operations work for investigations
- Investigations linked to saved repositories
- Context JSON stored and retrieved correctly
- Backend builds

**Completion Criteria**
- [ ] Create, list, get, update, delete investigations functional
- [ ] Linked to saved repositories via FK
- [ ] Context (JSON) stored correctly
- [ ] Authorization enforced
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D5-P5 — Notes and Bookmarks

**Objective**
Create CRUD endpoints for notes and bookmarks attached to repositories, commits, branches, or investigations.

**Why**
Notes let developers annotate their investigation findings. Bookmarks let them mark specific commits, branches, or files for quick reference. Both are essential for persistent investigation workflows.

**Scope**
- `backend/src/routes/notes.ts` — CRUD for notes
- `backend/src/routes/bookmarks.ts` — CRUD for bookmarks
- `backend/src/repositories/noteRepository.ts`
- Both support targetType (commit, branch, diff, repository) and targetRef

**Required Skills**
- `api-and-interface-design` — polymorphic target reference design
- `incremental-implementation` — add two related route sets

**Files / Modules**
- `backend/src/routes/notes.ts`
- `backend/src/routes/bookmarks.ts`
- `backend/src/repositories/noteRepository.ts`
- `backend/src/app.ts` (mount routes)

**Dependencies**
- D5-P4 (investigations must exist for optional FK)

**Validation**
- Notes CRUD with different target types
- Bookmarks CRUD with different target types
- Authorization enforced
- Backend builds

**Completion Criteria**
- [ ] Notes CRUD functional with targetType/targetRef
- [ ] Bookmarks CRUD functional with targetType/targetRef
- [ ] Linked to correct parent entities
- [ ] Authorization enforced
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D5-P6 — Tags and Workspace UI

**Objective**
Add tag management endpoints on the backend. Create the initial frontend `Workspace.tsx` page and add its route to `App.tsx`.

**Why**
Tags provide organizational structure for saved repositories. The Workspace page is the first frontend V2 feature — it proves the full stack works for authenticated users and gives them a place to see their saved content.

**Scope**
- Backend: Tag CRUD in `backend/src/routes/workspace.ts`, RepositoryTag assignment
- Frontend: Create `src/pages/Workspace.tsx` — displays saved repositories, basic auth UI
- Frontend: Add `/workspace` route to `src/App.tsx`
- Frontend: Extend `src/services/api.ts` with workspace and auth API calls

**Required Skills**
- `frontend-ui-engineering` — Workspace page layout, auth-aware UI
- `incremental-implementation` — add page and route without breaking existing pages
- `api-and-interface-design` — tag API design
- `browser-testing-with-devtools` — verify workspace page renders and API integration works

**Files / Modules**
- `backend/src/routes/workspace.ts` (extend with tags)
- `src/pages/Workspace.tsx` (new)
- `src/App.tsx` (add route)
- `src/services/api.ts` (extend)
- `src/types/workspace.ts` (new)

**Dependencies**
- D5-P5 (all backend workspace features must exist)

**Implementation Guidance**
- Workspace page should use the existing design system from `index.css`.
- Keep the initial UI simple: list of saved repositories with tags.
- Auth flow can be minimal (login form on the workspace page or redirect).

**Validation**
- Tags CRUD works on backend
- Workspace page renders at `/workspace`
- Saved repositories displayed for authenticated user
- Existing `/` and `/profile/:username` routes not broken
- Both frontend and backend build

**Browser Testing Required:** Yes — verify workspace page end-to-end

**Completion Criteria**
- [ ] Tag CRUD endpoints functional
- [ ] RepositoryTag assignment working
- [ ] `Workspace.tsx` renders saved repositories
- [ ] `/workspace` route added to `App.tsx`
- [ ] `api.ts` extended with workspace calls
- [ ] Both frontend and backend build

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 6 — AI Foundation

---

### D6-P1 — AI Provider Abstraction

**Objective**
Define the `AIProvider` interface and create the first concrete provider implementation. Configure API key loading from environment.

**Why**
The provider abstraction ensures GitExplore is not locked to a single AI vendor. The interface must be defined before any AI features can be built.

**Scope**
- Create `backend/src/ai/provider.ts` — `AIProvider` interface definition
- Create `backend/src/ai/providers/` — first implementation for chosen provider
- Create `backend/src/ai/types.ts` — AI request/response types
- Load AI API key from env config
- Resolve the UNDECIDED AI provider choice

**Required Skills**
- `api-and-interface-design` — provider interface design
- `security-and-hardening` — API key management, never expose in logs or responses
- `documentation-and-adrs` — record the provider choice decision
- `source-driven-development` — verify provider SDK/API usage against official docs

**Files / Modules**
- `backend/src/ai/provider.ts`
- `backend/src/ai/providers/*.ts`
- `backend/src/ai/types.ts`
- `backend/src/config/env.ts` (add AI config)
- `backend/.env.example` (add AI vars)

**Dependencies**
- D1-P4 (API infrastructure)

**Implementation Guidance**
- Interface should define: `analyze(request) → Promise<response>`.
- Request type includes: analysis type, context, prompt, response schema, max tokens.
- First provider implementation connects to the chosen LLM API.
- API key must never appear in logs, responses, or error messages.

**Validation**
- Provider interface defined with strict types
- First implementation connects to AI provider and returns a response
- API key loaded from env, never exposed
- Backend builds

**Completion Criteria**
- [ ] `AIProvider` interface defined
- [ ] First provider implementation functional
- [ ] API key management secure
- [ ] AI types defined
- [ ] Provider choice documented in MEMORY.md
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — move AI provider from UNDECIDED to DECIDED, Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D6-P2 — Context Builders

**Objective**
Create context builder functions for each AI analysis type that assemble structured evidence payloads from intelligence engine output.

**Why**
AI must receive structured repository evidence, not raw data dumps. Context builders are the boundary between deterministic analysis and AI interpretation — they control what evidence the AI sees and enforce token limits.

**Scope**
- Create `backend/src/ai/contextBuilder.ts`
- Builder functions for: repository overview, commit explanation, diff review, branch analysis, repository health
- Each builder accepts intelligence engine output, selects relevant fields, truncates to fit token limits

**Required Skills**
- `incremental-implementation` — build one context builder per analysis type
- `api-and-interface-design` — context payload structure design

**Files / Modules**
- `backend/src/ai/contextBuilder.ts`

**Dependencies**
- D6-P1 (AI types must exist)
- D4-P6 (intelligence engine output as input to context builders)

**Implementation Guidance**
- Each builder returns a structured object and a formatted prompt string.
- Token limits should be configurable per analysis type.
- Large diffs must be truncated intelligently (keep file headers, first N hunks).

**Validation**
- Each builder produces a valid context payload
- Payloads stay within configured token limits
- Backend builds

**Completion Criteria**
- [ ] Context builders for all 5 analysis types
- [ ] Token limit enforcement
- [ ] Structured payloads with relevant evidence fields
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D6-P3 — Prompt System

**Objective**
Create versioned prompt templates for each AI analysis type.

**Why**
Prompts must be versioned so cached AI results are invalidated when the prompt changes. Consistent prompt structure ensures predictable, high-quality AI output.

**Scope**
- Create `backend/src/ai/prompts/repositoryOverview.ts`
- Create `backend/src/ai/prompts/commitExplanation.ts`
- Create `backend/src/ai/prompts/diffReview.ts`
- Create `backend/src/ai/prompts/branchAnalysis.ts`
- Create `backend/src/ai/prompts/repositoryHealth.ts`
- Each template includes a version identifier and produces a formatted prompt string

**Required Skills**
- `incremental-implementation` — create one prompt template at a time
- `ponytail` — keep prompts clear and focused; no over-engineered prompt chaining

**Files / Modules**
- `backend/src/ai/prompts/*.ts`

**Dependencies**
- D6-P2 (context builders define what data the prompts receive)

**Implementation Guidance**
- Each prompt template is a function: `(context) → { prompt: string, version: string }`.
- Instruct the AI to base analysis on provided evidence only.
- Instruct the AI to state uncertainty rather than fabricate facts.

**Validation**
- All 5 prompt templates compile
- Version identifiers present
- Templates produce valid prompt strings from sample context data
- Backend builds

**Completion Criteria**
- [ ] 5 prompt template files created
- [ ] Each has a version identifier
- [ ] Each produces a formatted prompt from context
- [ ] AI grounding instructions included in each prompt
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D6-P4 — Structured Response Validation

**Objective**
Create validation schemas for each AI analysis response type. Add a validation layer between raw AI output and the application.

**Why**
AI responses are unpredictable. Schema validation ensures that invalid or malformed AI output is caught before it reaches the database or frontend. This is the safety boundary.

**Scope**
- Create `backend/src/ai/schemas/repositoryOverview.ts`
- Create `backend/src/ai/schemas/commitExplanation.ts`
- Create `backend/src/ai/schemas/diffReview.ts`
- Create `backend/src/ai/schemas/branchAnalysis.ts`
- Create `backend/src/ai/schemas/repositoryHealth.ts`
- Use Zod (or chosen validation library) — resolve UNDECIDED choice

**Required Skills**
- `api-and-interface-design` — response schema design matching ARCHITECTURE.md Section 9
- `source-driven-development` — verify Zod usage against official docs
- `documentation-and-adrs` — record schema validation library choice

**Files / Modules**
- `backend/src/ai/schemas/*.ts`
- `backend/package.json` (add Zod or chosen library)

**Dependencies**
- D6-P3 (prompt system defines what the AI should return)

**Validation**
- Schemas validate correct sample data
- Schemas reject invalid/malformed data with clear error messages
- Backend builds

**Completion Criteria**
- [ ] 5 response schemas created
- [ ] Valid sample data passes validation
- [ ] Invalid data rejected with clear errors
- [ ] Schema library choice documented in MEMORY.md
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — move schema validation library from UNDECIDED to DECIDED

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D6-P5 — AI Caching

**Objective**
Implement AI response caching using `contextHash` in the `AIAnalysis` database table.

**Why**
AI provider calls are slow and expensive. Caching prevents redundant calls when the same analysis is requested for the same input data.

**Scope**
- Create `backend/src/ai/cache.ts` — hash computation, cache lookup, cache store
- Create `backend/src/repositories/aiAnalysisRepository.ts` — database access for AIAnalysis
- Cache flow: compute contextHash → check DB → if hit and not expired, return cached → if miss, call provider → validate → store → return

**Required Skills**
- `incremental-implementation` — build cache layer step by step
- `performance-optimization` — efficient hash computation and TTL management

**Files / Modules**
- `backend/src/ai/cache.ts`
- `backend/src/repositories/aiAnalysisRepository.ts`

**Dependencies**
- D6-P4 (schemas must exist for validation)
- D2-P3 (AIAnalysis table must exist in schema)

**Validation**
- Duplicate requests return cached results without calling provider
- Expired cache entries trigger fresh provider calls
- Cache entries stored with contextHash, provider, model, token usage
- Backend builds

**Completion Criteria**
- [ ] contextHash computation deterministic for same input
- [ ] Cache lookup by contextHash works
- [ ] Expired entries re-fetched
- [ ] Cache entries stored in AIAnalysis table
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D6-P6 — AI API Foundation

**Objective**
Create AI analysis routes and controllers. Wire up the full pipeline: context builder → prompt → provider → validation → cache → response.

**Why**
This is the integration task that connects all D6 components into a working API. Without this, the individual pieces (provider, context builders, prompts, schemas, cache) are isolated modules.

**Scope**
- Create `backend/src/routes/ai.ts`
- Create `backend/src/controllers/aiController.ts`
- Wire the full pipeline for each analysis type
- Add error handling for provider failures, validation failures, and timeouts

**Required Skills**
- `api-and-interface-design` — AI endpoint design
- `incremental-implementation` — wire up one analysis type end-to-end, then replicate
- `debugging-and-error-recovery` — handle provider failures gracefully

**Files / Modules**
- `backend/src/routes/ai.ts`
- `backend/src/controllers/aiController.ts`
- `backend/src/app.ts` (mount route)

**Dependencies**
- D6-P1 through D6-P5 (all AI foundation components)

**Validation**
- AI endpoints accept requests and return validated responses
- Caching works (second identical request returns cached)
- Provider failures return structured error responses (not crashes)
- Backend builds

**Completion Criteria**
- [ ] AI routes mounted and accessible
- [ ] Full pipeline wired for all analysis types
- [ ] Caching integration working
- [ ] Error handling for provider failures
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 7 — Core AI Features

---

### D7-P1 — AI Repository Overview

**Objective**
End-to-end implementation and validation of the repository overview AI analysis.

**Why**
The repository overview is the most impactful AI feature — it gives developers an instant understanding of an unfamiliar repository's purpose, stack, and activity level.

**Scope**
- Finalize `POST /api/ai/repository-overview` pipeline
- Test with real repositories
- Verify response matches schema

**Required Skills**
- `incremental-implementation` — complete the end-to-end feature
- `test-driven-development` — test with known repository data

**Files / Modules**
- `backend/src/ai/prompts/repositoryOverview.ts`
- `backend/src/ai/schemas/repositoryOverview.ts`
- `backend/src/controllers/aiController.ts`

**Dependencies**
- D6-P6 (AI API foundation)

**Validation**
- Returns structured overview: purpose, techStack, activityLevel, maintenanceAssessment, notablePatterns
- Schema validation passes
- Caching works
- Provider failure returns graceful error

**Completion Criteria**
- [ ] Repository overview endpoint returns valid structured response
- [ ] Response grounded in actual repository data
- [ ] Schema validation passes
- [ ] Caching works
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D7-P2 — AI Commit Explainer

**Objective**
End-to-end implementation and validation of the commit explanation AI analysis.

**Why**
Understanding why a commit was made and what it changes is core to repository investigation. AI explains commit intent from patch evidence.

**Scope**
- Finalize `POST /api/ai/commit-explanation` pipeline
- Test with real commit data

**Required Skills**
- `incremental-implementation` — complete the feature
- `test-driven-development` — test with known commit data

**Files / Modules**
- `backend/src/ai/prompts/commitExplanation.ts`
- `backend/src/ai/schemas/commitExplanation.ts`

**Dependencies**
- D6-P6

**Validation**
- Returns: summary, motivation, changes per file, risks, complexity
- Schema validation passes

**Completion Criteria**
- [ ] Commit explanation endpoint returns valid structured response
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D7-P3 — AI Diff Review

**Objective**
End-to-end implementation and validation of the diff review AI analysis.

**Why**
Automated diff review highlights observations, potential issues, and patterns in code changes — reducing the cognitive load of manual review.

**Scope**
- Finalize `POST /api/ai/diff-review` pipeline

**Required Skills**
- `incremental-implementation`
- `test-driven-development`

**Files / Modules**
- `backend/src/ai/prompts/diffReview.ts`
- `backend/src/ai/schemas/diffReview.ts`

**Dependencies**
- D6-P6

**Validation**
- Returns observations per file with severity and category
- Schema validation passes

**Completion Criteria**
- [ ] Diff review endpoint returns valid structured response
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D7-P4 — AI Branch Analysis

**Objective**
End-to-end implementation and validation of the branch divergence AI analysis.

**Why**
Before merging or reviewing a branch, developers need a structured assessment of what diverged, why, and what the risks are.

**Scope**
- Finalize `POST /api/ai/branch-analysis` pipeline

**Required Skills**
- `incremental-implementation`
- `test-driven-development`

**Files / Modules**
- `backend/src/ai/prompts/branchAnalysis.ts`
- `backend/src/ai/schemas/branchAnalysis.ts`

**Dependencies**
- D6-P6

**Validation**
- Returns divergence summary, notable changes, merge risk, recommendations
- Schema validation passes

**Completion Criteria**
- [ ] Branch analysis endpoint returns valid structured response
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D7-P5 — AI Repository Health

**Objective**
End-to-end implementation and validation of the repository health AI analysis.

**Why**
Repository health assessment helps developers quickly evaluate whether a project is actively maintained, stale, or abandoned before investing time in it.

**Scope**
- Finalize `POST /api/ai/repository-health` pipeline

**Required Skills**
- `incremental-implementation`
- `test-driven-development`

**Files / Modules**
- `backend/src/ai/prompts/repositoryHealth.ts`
- `backend/src/ai/schemas/repositoryHealth.ts`

**Dependencies**
- D6-P6

**Validation**
- Returns health score, activity assessment, maintenance signals, risks, recommendations
- Schema validation passes

**Completion Criteria**
- [ ] Repository health endpoint returns valid structured response
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D7-P6 — AI UI Integration

**Objective**
Create frontend AI components and wire them to the backend AI API.

**Why**
AI analysis results must be rendered in the frontend. This is the first time users see AI-generated content in GitExplore.

**Scope**
- Create `src/components/AIOverview.tsx`, `AICommitExplainer.tsx`, `AIDiffReview.tsx`, `AIBranchAnalysis.tsx`, `AIHealthAnalysis.tsx`
- Create `src/types/ai.ts` — frontend AI response types
- Extend `src/services/api.ts` with AI API calls
- Integrate AI panels into the Profile/repository workbench

**Required Skills**
- `frontend-ui-engineering` — AI result panels with loading, error, and success states
- `incremental-implementation` — build one component, verify, then build the next
- `browser-testing-with-devtools` — verify AI panels render correctly with real data

**Files / Modules**
- `src/components/AIOverview.tsx`
- `src/components/AICommitExplainer.tsx`
- `src/components/AIDiffReview.tsx`
- `src/components/AIBranchAnalysis.tsx`
- `src/components/AIHealthAnalysis.tsx`
- `src/types/ai.ts`
- `src/services/api.ts`
- `src/pages/Profile.tsx` (integrate AI panels)

**Dependencies**
- D7-P1 through D7-P5 (all AI endpoints must be functional)

**Implementation Guidance**
- AI content must be visually distinguishable from deterministic data (per RULES.md).
- Each component needs loading, success, error, and "AI unavailable" states.
- Use the existing design system from `index.css`.

**Validation**
- AI panels render in the repository workbench
- Loading states display during API calls
- Error states display when AI is unavailable
- Cached results display instantly on repeated views
- Frontend builds
- Existing V1 functionality not broken

**Browser Testing Required:** Yes — verify all AI panels end-to-end

**Completion Criteria**
- [ ] All 5 AI components created
- [ ] AI types defined in `src/types/ai.ts`
- [ ] AI API calls in `api.ts`
- [ ] AI panels integrated into Profile page
- [ ] Loading, error, and success states functional
- [ ] Frontend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 8 — AI Investigation

---

### D8-P1 — Repository Investigation Context Engine

**Objective**
Build comprehensive context assembly for free-form repository investigation combining all intelligence engine outputs.

**Why**
Repository Q&A requires a rich, comprehensive context that spans DAG structure, statistics, recent commits, file changes, and contributor data. The context engine assembles this from existing intelligence outputs.

**Scope**
- Extend `backend/src/ai/contextBuilder.ts` with investigation-specific context builder
- Combine multiple intelligence sources into a single coherent context

**Required Skills**
- `incremental-implementation` — extend existing context builder
- `performance-optimization` — ensure combined context stays within token limits

**Files / Modules**
- `backend/src/ai/contextBuilder.ts`

**Dependencies**
- D7-P6 (all core AI features must be functional)

**Validation**
- Investigation context builder produces comprehensive payloads
- Payloads stay within token limits
- Backend builds

**Completion Criteria**
- [ ] Investigation context builder functional
- [ ] Combines multiple intelligence sources
- [ ] Token limit enforced
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D8-P2 — Repository Q&A API

**Objective**
Create `POST /api/ai/repository-qa` endpoint for natural-language questions about repositories.

**Why**
Q&A lets developers ask specific questions about a repository and receive evidence-grounded answers, moving beyond pre-defined analysis types.

**Scope**
- Add Q&A route and handler
- Create `backend/src/ai/prompts/repositoryQA.ts`
- Create `backend/src/ai/schemas/repositoryQA.ts`

**Required Skills**
- `api-and-interface-design` — Q&A endpoint design with question input and structured answer output
- `incremental-implementation`
- `security-and-hardening` — sanitize user question input

**Files / Modules**
- `backend/src/routes/ai.ts`
- `backend/src/ai/prompts/repositoryQA.ts`
- `backend/src/ai/schemas/repositoryQA.ts`
- `backend/src/controllers/aiController.ts`

**Dependencies**
- D8-P1 (investigation context engine)

**Validation**
- Q&A endpoint returns structured answer with evidence references
- User input sanitized
- Backend builds

**Completion Criteria**
- [ ] Q&A endpoint functional
- [ ] Returns structured answer with evidence
- [ ] Input sanitized
- [ ] Backend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D8-P3 — Repository Q&A UI

**Objective**
Create a frontend Q&A panel for asking questions about the current repository.

**Why**
The Q&A interface is the most interactive AI feature. It lets developers explore repository understanding through natural-language questions.

**Scope**
- Create `src/components/RepositoryQA.tsx`
- Extend `src/services/api.ts` with Q&A API call
- Integrate into the Profile page

**Required Skills**
- `frontend-ui-engineering` — Q&A input, answer display, loading/error states
- `browser-testing-with-devtools` — verify Q&A interaction in browser

**Files / Modules**
- `src/components/RepositoryQA.tsx`
- `src/services/api.ts`
- `src/pages/Profile.tsx` (integrate)

**Dependencies**
- D8-P2 (Q&A API must exist)

**Validation**
- Q&A panel renders
- Questions submitted successfully
- Answers display with loading/error states
- Frontend builds

**Browser Testing Required:** Yes

**Completion Criteria**
- [ ] Q&A component renders
- [ ] Question submission works
- [ ] Answer display with evidence references
- [ ] Loading/error states
- [ ] Frontend builds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D8-P4 — Evidence References

**Objective**
Ensure all AI responses include references to specific evidence (commit SHAs, file paths, branch names). Display references as clickable links in the UI.

**Why**
Evidence references are what distinguishes GitExplore's AI from a generic chatbot. Every AI claim must be traceable to actual repository data.

**Scope**
- Update AI prompt templates to explicitly request evidence references
- Update AI schemas to include evidence arrays
- Update frontend AI components to render evidence as clickable links

**Required Skills**
- `incremental-implementation` — update prompts, schemas, and UI components
- `frontend-ui-engineering` — render evidence links

**Files / Modules**
- `backend/src/ai/prompts/*.ts`
- `backend/src/ai/schemas/*.ts`
- `src/components/AI*.tsx`

**Dependencies**
- D8-P3 (Q&A UI must exist)

**Validation**
- AI responses include evidence arrays
- Evidence rendered as clickable links in the UI
- Links navigate to correct repository data

**Completion Criteria**
- [ ] Prompts request evidence references
- [ ] Schemas include evidence arrays
- [ ] UI renders evidence as links
- [ ] Links navigate correctly
- [ ] Both builds pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D8-P5 — AI Investigation History

**Objective**
Save AI analysis results as part of investigation records. Display analysis history in the workspace.

**Why**
Without history, AI analyses are ephemeral. Persisting them lets developers review past analyses and track how their understanding evolved.

**Scope**
- Link AI analysis results to investigation records
- Display analysis history in Workspace page

**Required Skills**
- `incremental-implementation` — extend existing investigation and workspace code
- `frontend-ui-engineering` — history display in workspace

**Files / Modules**
- `backend/src/controllers/investigationController.ts`
- `src/pages/Workspace.tsx`

**Dependencies**
- D8-P4 (evidence references)
- D5-P4 (investigation CRUD)

**Validation**
- AI analyses linked to investigations
- History displayed in workspace
- Both builds pass

**Completion Criteria**
- [ ] AI analyses saved to investigation records
- [ ] History displayed in workspace UI
- [ ] Both builds pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D8-P6 — AI Failure and Error Hardening

**Objective**
Handle AI provider timeouts, invalid responses, rate limits, and outages. Ensure deterministic analysis always works when AI is unavailable.

**Why**
AI providers are external dependencies that can fail. The application must degrade gracefully — deterministic Git intelligence must always be available regardless of AI status.

**Scope**
- Add timeout handling to AI provider
- Add retry logic for transient failures
- Add rate limiting on AI endpoints
- Update frontend AI components with "AI unavailable" fallback states
- Verify deterministic features work when AI provider is completely unreachable

**Required Skills**
- `debugging-and-error-recovery` — systematic error handling across the AI pipeline
- `security-and-hardening` — rate limiting on expensive AI endpoints
- `incremental-implementation` — harden each failure point

**Files / Modules**
- `backend/src/ai/provider.ts`
- `backend/src/controllers/aiController.ts`
- `backend/src/middleware/rateLimiter.ts`
- `src/components/AI*.tsx`

**Dependencies**
- D8-P5 (all AI features must be functional before hardening)

**Validation**
- Provider timeout returns structured error
- Invalid AI responses caught by schema validation
- Rate limits enforced on AI endpoints
- Frontend shows "AI unavailable" message on failures
- Deterministic features unaffected by AI outage
- Both builds pass

**Completion Criteria**
- [ ] Timeout handling on provider calls
- [ ] Schema validation catches invalid responses
- [ ] Rate limiting on AI endpoints
- [ ] Frontend fallback states for AI failure
- [ ] Deterministic analysis works when AI is down
- [ ] Both builds pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 9 — Engineering Hardening

---

### D9-P1 — Backend Tests

**Objective**
Unit and integration tests for all backend services, controllers, and middleware.

**Why**
Comprehensive test coverage catches regressions before they reach production. Critical paths (auth, GitHub proxy, workspace CRUD) must be tested.

**Scope**
- `backend/tests/services/*` — service layer tests
- `backend/tests/routes/*` — route integration tests
- `backend/tests/middleware/*` — middleware unit tests

**Required Skills**
- `test-driven-development` — comprehensive test coverage for critical paths
- `code-review-and-quality` — review test quality and coverage

**Files / Modules**
- `backend/tests/services/*`
- `backend/tests/routes/*`
- `backend/tests/middleware/*`

**Dependencies**
- D8-P6 (all features must be implemented before comprehensive testing)

**Validation**
- All tests pass
- Auth endpoints tested (register, login, logout, protected access)
- GitHub proxy endpoints tested
- Workspace CRUD tested
- Error handling tested

**Completion Criteria**
- [ ] Service tests written and passing
- [ ] Route integration tests written and passing
- [ ] Middleware tests written and passing
- [ ] Critical paths covered

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D9-P2 — Repository Intelligence Tests

**Objective**
Unit tests for all intelligence engine functions with known inputs and expected outputs.

**Why**
Intelligence engine functions are pure and deterministic — they are the most testable code in the system. Bugs here propagate into AI context and analysis results.

**Scope**
- Tests for commitGraph, statistics, divergence, fileAnalysis, evolution

**Required Skills**
- `test-driven-development` — test deterministic functions with known data
- `constraint-driven-development` — establish minimum coverage requirements for the intelligence engine

**Files / Modules**
- `backend/tests/intelligence/*`

**Dependencies**
- D4-P6 (intelligence engine must exist)

**Validation**
- All intelligence functions tested with known inputs
- Edge cases covered (empty repos, single commit, 1000+ commits, merge-heavy histories)

**Completion Criteria**
- [ ] commitGraph tests with merge/root/head detection
- [ ] statistics tests with known values
- [ ] divergence tests with ahead/behind verification
- [ ] fileAnalysis tests with churn calculations
- [ ] evolution tests with timeline generation
- [ ] All tests pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D9-P3 — AI Contract Tests

**Objective**
Test AI response schema validation, caching behavior, and prompt versioning.

**Why**
AI contract tests verify that the boundary between GitExplore and external AI providers is correctly enforced — schemas reject invalid data, caching works, and prompt version changes invalidate cache.

**Scope**
- Schema validation tests with valid and invalid sample data
- Cache hit/miss tests
- Prompt version invalidation tests

**Required Skills**
- `test-driven-development` — contract testing between systems
- `doubt-driven-development` — adversarial testing of AI boundary

**Files / Modules**
- `backend/tests/ai/*`

**Dependencies**
- D7-P6 (all AI features must exist)

**Validation**
- Schema validation tests pass for all 5+ analysis types
- Cache correctly returns hits and triggers misses
- Prompt version changes invalidate cached results

**Completion Criteria**
- [ ] Schema validation tests for all analysis types
- [ ] Cache hit/miss tests
- [ ] Prompt version invalidation tests
- [ ] All tests pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D9-P4 — Security Hardening

**Objective**
Audit and harden input validation, authentication, rate limiting, CORS, and secret management across the entire backend.

**Why**
Security vulnerabilities in auth, API keys, or input handling can compromise user data and the AI provider budget. A dedicated hardening pass catches issues that were deferred during feature development.

**Scope**
- Audit all middleware for input validation gaps
- Verify no secrets in client bundles or logs
- Verify auth enforced on all protected routes
- Verify rate limits active on expensive endpoints (AI, GitHub proxy)
- Verify CORS restricts to frontend origin only

**Required Skills**
- `security-and-hardening` — systematic security audit
- `doubt-driven-development` — adversarial review of auth and secret handling
- `code-review-and-quality` — cross-cutting quality review

**Files / Modules**
- `backend/src/middleware/*`
- `backend/src/config/*`
- `backend/src/services/authService.ts`
- `backend/src/ai/provider.ts`

**Dependencies**
- D9-P1 (backend tests should exist to verify fixes)

**Validation**
- No secrets in client bundles (verify with `grep` on dist/)
- Auth enforced on all protected routes
- Rate limits active on AI and GitHub endpoints
- Input validation on all endpoints
- CORS configured correctly

**Completion Criteria**
- [ ] No secrets exposed in client bundles, logs, or error responses
- [ ] Auth enforced on all workspace/investigation endpoints
- [ ] Rate limits active on AI and GitHub proxy endpoints
- [ ] Input validation on all endpoints
- [ ] CORS restricted to frontend origin
- [ ] Both builds pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section, security audit completion

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D9-P5 — Performance Optimization

**Objective**
Profile and optimize slow paths. Add database indexes where needed. Optimize AI context builder token usage.

**Why**
Performance issues that are acceptable in development become blockers in production. This pass identifies and fixes concrete bottlenecks.

**Scope**
- Profile API response times
- Check for N+1 query patterns in Prisma
- Add database indexes where query analysis shows need
- Optimize AI context builder truncation logic
- Verify frontend bundle size is reasonable

**Required Skills**
- `performance-optimization` — systematic profiling and optimization
- `ponytail` — remove unnecessary computation or over-fetching

**Files / Modules**
- `backend/prisma/schema.prisma` (indexes)
- `backend/src/ai/contextBuilder.ts`
- `backend/src/services/*`
- Various files based on profiling results

**Dependencies**
- D9-P4 (security hardening may change middleware that affects performance)

**Validation**
- No N+1 queries
- API response times under 2 seconds for standard operations
- AI context builder within token limits
- Frontend bundle size not significantly larger than V1

**Completion Criteria**
- [ ] No N+1 query patterns
- [ ] Database indexes added where needed
- [ ] AI context builder optimized
- [ ] Response times acceptable
- [ ] Both builds pass

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D9-P6 — Failure and Degraded-State Testing

**Objective**
Test application behavior when external dependencies (GitHub API, database, AI provider) are unavailable.

**Why**
Production systems must handle external failures gracefully. This testing verifies the application degrades without crashing.

**Scope**
- Test with GitHub API unreachable
- Test with database unreachable
- Test with AI provider unreachable
- Test with network degraded
- Verify frontend offline banner still works

**Required Skills**
- `test-driven-development` — failure scenario testing
- `debugging-and-error-recovery` — verify graceful degradation paths
- `browser-testing-with-devtools` — verify frontend degraded states

**Files / Modules**
- `backend/tests/*`
- Manual browser testing

**Dependencies**
- D9-P5

**Validation**
- Graceful degradation in all failure scenarios
- No unhandled promise rejections
- No server crashes
- Frontend shows appropriate error states

**Browser Testing Required:** Yes — verify offline banner and degraded states

**Completion Criteria**
- [ ] GitHub API failure handled gracefully
- [ ] Database failure handled gracefully
- [ ] AI provider failure handled gracefully
- [ ] No unhandled crashes
- [ ] Frontend error states verified

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

## DAY 10 — Production

---

### D10-P1 — Full CI/Build Pipeline

**Objective**
Finalize the CI pipeline to run frontend build, backend build, Prisma generation, and all tests.

**Why**
The CI pipeline is the automated quality gate. It must catch any regression before code reaches production.

**Scope**
- Update `.github/workflows/ci.yml` to include all build and test steps
- Add Prisma generate step
- Add test execution step

**Required Skills**
- `ci-cd-and-automation` — CI pipeline finalization
- `source-driven-development` — verify GitHub Actions configuration

**Files / Modules**
- `.github/workflows/ci.yml`

**Dependencies**
- D9-P6 (all tests must be written)

**Validation**
- CI pipeline YAML is valid
- All build and test steps defined
- Pipeline would pass for current codebase

**Completion Criteria**
- [ ] Frontend build step
- [ ] Backend build step
- [ ] Prisma generate step
- [ ] Test execution step
- [ ] Pipeline YAML valid

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D10-P2 — Documentation Finalization

**Objective**
Update all documentation to reflect the final V2 implementation state.

**Why**
Documentation must accurately describe what was built. Stale documentation misleads future developers and agents.

**Scope**
- Update `README.md` with V2 features, backend setup, database setup
- Update `AGENTS.md` with V2 architecture and rules
- Update `docs/ARCHITECTURE.md` with any changes from implementation
- Update `docs/MEMORY.md` with final state

**Required Skills**
- `documentation-and-adrs` — documentation update and accuracy verification
- `code-review-and-quality` — verify documentation matches implementation

**Files / Modules**
- `README.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MEMORY.md`

**Dependencies**
- D10-P1

**Validation**
- Documentation matches implemented features
- No planned features documented as completed
- Setup instructions work for a new developer

**Completion Criteria**
- [ ] README.md updated with V2 setup and features
- [ ] AGENTS.md updated with V2 architecture
- [ ] ARCHITECTURE.md reflects actual implementation
- [ ] MEMORY.md reflects final state
- [ ] No inaccuracies

**Documentation Updates**
- This task IS the documentation update

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D10-P3 — Production Configuration

**Objective**
Configure production environment variables, database connection, CORS origins, and deployment settings.

**Why**
Production configuration must be correct before deployment. Misconfigured CORS, database URLs, or API keys will cause immediate production failures.

**Scope**
- Finalize production env configuration
- Configure production CORS origins
- Configure production database URL
- Verify `.env.example` is complete and accurate

**Required Skills**
- `shipping-and-launch` — production configuration
- `security-and-hardening` — verify no secrets committed

**Files / Modules**
- `backend/src/config/env.ts`
- `backend/.env.example`
- Deployment configuration files

**Dependencies**
- D10-P2

**Validation**
- Production configuration complete
- No secrets in committed files
- `.env.example` documents all required variables

**Completion Criteria**
- [ ] All production env vars documented
- [ ] No secrets in committed files
- [ ] CORS configured for production origin
- [ ] Database URL configuration documented

**Documentation Updates**
- Update `docs/MEMORY.md` — deployment decisions

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D10-P4 — Production Candidate

**Objective**
Build production frontend and backend. Verify both compile and run correctly.

**Why**
A production candidate build proves the entire application compiles and starts. This is the final technical gate before deployment validation.

**Scope**
- `npm run build` (frontend)
- Backend production build
- Start both and verify basic functionality

**Required Skills**
- `shipping-and-launch` — production build verification
- `debugging-and-error-recovery` — fix any build failures

**Files / Modules**
- N/A (build verification)

**Dependencies**
- D10-P3

**Validation**
- Frontend `npm run build` passes
- Backend build passes
- Application starts and serves requests
- `GET /api/health` returns 200

**Completion Criteria**
- [ ] Frontend production build succeeds
- [ ] Backend production build succeeds
- [ ] Application starts
- [ ] Health endpoint responds

**Documentation Updates**
- Update `docs/MEMORY.md` — Current Task section

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D10-P5 — Full Production Validation

**Objective**
End-to-end validation of all user flows from PRD Section 9.

**Why**
The final validation proves the entire application works as specified before release. Every user flow must be tested.

**Scope**
- Test New User flow: search → profile → repos → analysis → AI
- Test Investigation flow: repo → branch → commit → diff → AI → save
- Test Workspace flow: login → workspace → saved repos → investigations → notes
- Test Branch Comparison flow: base/head → comparison → AI analysis

**Required Skills**
- `browser-testing-with-devtools` — end-to-end browser verification
- `code-review-and-quality` — final quality review
- `shipping-and-launch` — pre-launch validation

**Files / Modules**
- N/A (testing)

**Dependencies**
- D10-P4

**Browser Testing Required:** Yes — all user flows

**Validation**
- All user flows from PRD Section 9 work correctly
- No JavaScript console errors
- No broken network requests
- AI features return valid responses
- Workspace features persist correctly

**Completion Criteria**
- [ ] New User flow verified
- [ ] Investigation flow verified
- [ ] Workspace flow verified
- [ ] Branch Comparison flow verified
- [ ] No console errors or broken requests

**Documentation Updates**
- Update `docs/MEMORY.md` — validation results

**Git**
- Implementation only. Antigravity MUST NOT commit. Antigravity MUST NOT push. User manually reviews and runs Git commands.

**Status:** `[ ]`

---

### D10-P6 — V2 Release Preparation

**Objective**
Final audit. Update all documentation to reflect completed state. Prepare for merge from `v2-fullstack` to `main`.

**Why**
The release preparation ensures everything is clean, documented, and ready for the user to merge. The agent does not merge — it prepares the materials.

**Scope**
- Final consistency audit across all docs
- Update `docs/TASK.md` — verify all 60 tasks completed
- Update `docs/MEMORY.md` — final project state
- Prepare release notes summarizing V2 changes

**Required Skills**
- `shipping-and-launch` — release preparation checklist
- `git-workflow-and-versioning` — release preparation (tag recommendation, PR description)
- `code-review-and-quality` — final cross-project review
- `ponytail-audit` — final check for over-engineering before release

**Files / Modules**
- `docs/TASK.md`
- `docs/MEMORY.md`

**Dependencies**
- D10-P5

**Validation**
- All 60 tasks show `[x]` status
- Documentation accurate and final
- No planned features documented as completed
- Release notes prepared

**Completion Criteria**
- [ ] All 60 tasks completed and documented
- [ ] Documentation final and accurate
- [ ] Release notes prepared
- [ ] Merge strategy documented for user

**Documentation Updates**
- `docs/MEMORY.md` — final state
- `docs/TASK.md` — all statuses final

**Git**
- Implementation only.
- Antigravity MUST NOT commit.
- Antigravity MUST NOT push.
- Antigravity MUST NOT merge.
- User manually reviews, merges, and deploys.

**Status:** `[ ]`
