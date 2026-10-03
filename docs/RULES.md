# GitExplore V2 — Rules

This document defines mandatory engineering constraints for all agents and developers working on GitExplore V2. These rules are non-negotiable.

---

## Git Rules

- **Never develop V2 on `main`.** V2 work happens on `v2-fullstack`. Production remains on `main`.
- **Never force-push `main`.** History must remain intact.
- **Never automatically merge `v2-fullstack` to `main`.** Merges require explicit validation and approval.
- **Commit after validated milestones.** Each commit should represent a working, buildable state. Do not create commits that break `tsc` or `vite build`.
- **Do not create meaningless commits.** Every commit message should describe what changed and why.
- **Do not commit secrets.** No API keys, tokens, passwords, or connection strings in committed files. Use `.env` files (which are in `.gitignore`).

---

## V1 Preservation Rules

- **Never delete working V1 functionality.** The existing frontend is production software. Do not remove components, pages, services, or styles that work.
- **Do not rewrite the frontend without justification.** Add new components and services alongside existing ones. Modify existing files only when a V2 feature specifically requires it.
- **Preserve existing Git intelligence.** The `buildCommitRelationshipModel`, `processUserActivity`, and all other analysis functions in `githubApi.ts` must remain functional.
- **Preserve existing UI unless a feature requires change.** The frosted glass design system, responsive breakpoints, and animation patterns are intentional. Do not redesign them as part of V2 infrastructure work.
- **V1 must remain recoverable.** If `v2-fullstack` is abandoned, `main` must still be a fully functional production application.

---

## Coding Rules

- **TypeScript strict mode.** Both frontend and backend must use `"strict": true`.
- **Never use `any`.** Every variable, parameter, and return type must be explicitly typed.
- **Never use `@ts-ignore` or `@ts-nocheck`.** Fix the type error instead.
- **No unchecked type assertions.** Do not use `as unknown as T` or similar escape hatches. Use type guards and validation functions.
- **Explicit types on function signatures.** Parameters and return types must be declared, not inferred.
- **Meaningful naming.** Variables, functions, and types must describe what they represent. No single-letter variables outside loop indices.
- **Small focused functions.** Functions should do one thing. If a function exceeds ~80 lines, consider whether it should be split.
- **Avoid premature abstractions.** Do not create generic framework-like abstractions before having at least two concrete use cases.

---

## Architecture Rules

- **Solve real problems.** Every component, service, and database table must trace back to a requirement in the PRD. Do not build infrastructure for its own sake.
- **No unnecessary libraries.** Before adding a dependency, verify that the standard library or existing packages do not already solve the problem.
- **No unnecessary state management.** The frontend uses React hooks (`useState`, `useMemo`, `useCallback`). Do not introduce Redux, Zustand, MobX, or similar unless a concrete, documented problem requires it.
- **No microservices.** One backend. One database. One deployment unit. Do not split the backend into multiple services.
- **No Redis unless justified.** In-memory caching on the backend is sufficient until profiling proves otherwise. Document the justification if Redis is introduced.
- **No message queues unless workload requires them.** Do not add RabbitMQ, Bull, or similar unless async job processing is demonstrated to be necessary.
- **No Kubernetes.** The deployment target is a simple hosting provider (Vercel, Render, Railway, Fly.io). Do not containerize for orchestration.
- **No infrastructure for resume optics.** Do not add technologies to make the project look impressive. Add technologies to solve problems.

---

## API Rules

- **Validate all inputs.** Every API endpoint must validate request parameters, body, and query strings before processing.
- **Validate external data.** GitHub API responses and AI provider responses must be validated before use. Never trust external data shapes.
- **Consistent error responses.** All API errors must return a consistent JSON structure: `{ error: string, code: string, details?: unknown }`.
- **Centralized error handling.** Use middleware for error formatting. Do not catch and format errors individually in every controller.
- **Never expose private API keys.** GitHub tokens, AI keys, and database credentials must never appear in API responses, logs (in production), or client-side code.
- **Rate-limit external API calls.** The backend must track and respect GitHub API rate limits. AI provider calls must have per-user and global rate limits.
- **Cache where useful.** GitHub data and AI analyses should be cached with appropriate TTLs to reduce external API calls.

---

## Database Rules

- **PostgreSQL (Neon Free Plan) only.** Do not introduce SQLite, MongoDB, Supabase, or other database engines/providers.
- **Prisma ORM.** All database access goes through Prisma. No raw SQL unless Prisma genuinely cannot express the query.
- **Migrations.** Schema changes must use Prisma migrations. Do not modify the database schema manually.
- **Indexes where justified.** Add indexes on foreign keys and frequently queried columns. Do not add indexes speculatively.
- **Do not store redundant GitHub responses.** The database stores workspace entities (saved repos, investigations, notes) and cached AI analyses. It does not mirror the GitHub API.
- **Preserve relationships and constraints.** Foreign keys must be enforced. Cascading deletes must be intentional and documented.

---

## AI Rules

This section is critical. AI misuse is the highest-risk area in V2.

- **Official AI Provider Decision**: Google Gemini API via Google AI Studio (Free Tier, Flash-class model) is the locked provider.
- **Server-side secrets only**: `GEMINI_API_KEY` lives strictly in the backend `.env` file and must never be committed, logged, or exposed in client bundles or API responses.
- **Frontend separation**: The frontend must NEVER directly call Google Gemini API. All AI interactions route through GitExplore backend endpoints.
- **Provider abstraction is a mandatory boundary**: All services and controllers must interact with AI solely via the `AIProvider` interface. The provider implementation must be swappable without changing application business logic or frontend code.
- **AI is not the source of truth**: Repository data from the GitHub API is the source of truth. AI interprets this data — it does not generate repository facts.
- **Structured evidence only**: AI must receive structured GitExplore evidence/context payloads assembled by the `contextBuilder` from deterministic intelligence outputs, not arbitrary raw repository files by default.
- **Never fabricate repository facts**: Prompts must instruct the AI to base its analysis on the provided evidence only. AI should state uncertainty rather than invent details.
- **Mandatory structured response validation**: Every AI response must be validated against a typed Zod schema. Invalid responses are immediately rejected with safe fallbacks.
- **Limit context size**: Context payloads must respect token limits. Large diffs must be truncated. The context builder is responsible for staying within bounds.
- **Version prompts**: Each prompt template has a version identifier. When prompts change, the version increments, invalidating cached results.
- **Cache repeated analyses**: If the same input data (same contextHash) has already been analyzed, return the cached result instead of calling the AI provider again.
- **Handle AI failure gracefully**: If the AI provider is down, rate-limited, or returns unparseable content, the application must continue working. Show a clear "AI unavailable" message. Deterministic analysis is always available.
- **Clearly separate AI inference from deterministic metrics**: In the UI, AI-generated content must be visually distinct from deterministic data. Users should know what is computed and what is interpreted.

---

## Testing Rules

Every feature must include appropriate testing:

- **TypeScript validation.** `tsc -b` must pass with zero errors at every commit.
- **Build validation.** `npm run build` (frontend) and the backend build command must succeed at every commit.
- **Unit tests for intelligence engine.** Deterministic analysis functions must have unit tests with known inputs and expected outputs.
- **Integration tests for API endpoints.** Critical API routes must have integration tests verifying request/response contracts.
- **AI contract tests.** AI response schemas must be tested with sample data to verify schema validation works correctly.
- **Error-state testing.** Every external call (GitHub API, AI provider, database) must have test coverage for failure scenarios.
- **Do not delete or skip tests.** Tests that fail must be fixed, not removed or marked as skipped.

---

## Documentation Rules

- **Update documentation when architecture changes.** If a new component, service, or database table is introduced, update `ARCHITECTURE.md`.
- **Never document planned features as completed.** The `TASK.md` file uses status markers. `[x]` means done and verified. `[ ]` means not started. Do not mark tasks complete before they are implemented and validated.
- **Keep `MEMORY.md` current.** After completing a milestone, update the current state, completed decisions, and changelog sections.
- **Do not duplicate information excessively.** `PRD.md` defines what. `ARCHITECTURE.md` defines how. `RULES.md` defines constraints. `TASK.md` defines execution order. `MEMORY.md` defines current state. Reference between documents instead of copying large sections.

---

## Scope Rules

- **Implement only the requested feature.** Do not refactor unrelated files while implementing a feature.
- **Do not gold-plate.** Build what the task requires. If a task says "add health check endpoint," do not also add metrics, tracing, and dashboards.
- **One concern per commit.** A commit that adds a database table should not also refactor the frontend search bar.
