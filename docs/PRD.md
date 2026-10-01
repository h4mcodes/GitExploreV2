# GitExplore V2 — Product Requirements Document

## 1. Product Overview

GitExplore V2 is a full-stack Git Repository Intelligence & Management Platform. It helps developers understand, investigate, analyze, and retain context about Git repositories.

The V1 frontend (production on Vercel) already centralizes GitHub profile search, repository exploration, branch topology, commit history, bidirectional DAG modeling, code diffs, branch comparisons, and contribution calendars into a single client-side workspace.

V2 extends this foundation with three new capabilities:

1. **Server-side GitHub integration** — moves API calls behind a Node.js backend so GitHub tokens can be stored securely, rate limits are managed per-server instead of per-browser, and response shaping happens before data reaches the client.
2. **Persistent workspace** — a Neon PostgreSQL database (Free Plan, accessed through Prisma ORM) stores saved repositories, investigations, notes, bookmarks, and tags so a developer can close the browser and pick up exactly where they left off.
3. **AI-assisted repository investigation** — an AI interpretation layer that receives structured, deterministic Git analysis evidence and returns grounded explanations. AI does not invent repository facts. It interprets data GitExplore has already computed.

The relationship between these layers:

```
GitHub data (commits, branches, diffs, contributors)
        ↓
Deterministic repository analysis (DAG, statistics, churn, divergence)
        ↓
Structured evidence payload
        ↓
AI interpretation (overview, commit explanation, diff review, health)
        ↓
Developer insight presented in the workspace
```

---

## 2. Problem Statement

Developers working with unfamiliar or complex repositories must manually navigate between:

- Repository overview pages
- Branch lists
- Commit logs
- Individual commit pages
- Diff views
- Contributor profiles
- Comparison views
- Git history in the terminal

This creates fragmented investigation workflows. Context is lost between tabs. There is no persistent record of what was investigated or why. There is no way to ask "what changed between these branches and why does it matter?" without manually assembling the evidence.

GitExplore V1 already reduces some of this fragmentation by putting profile search, repositories, branches, commits, DAGs, diffs, and branch comparisons on one screen. But it has three gaps:

1. **No persistence** — closing the tab loses all investigation context.
2. **No server-side integration** — GitHub API rate limits (60 req/hr unauthenticated) constrain heavy investigation.
3. **No interpretation layer** — the developer must manually read every diff, commit message, and branch divergence to draw conclusions.

V2 closes these gaps.

---

## 3. Product Vision

GitExplore should become a developer workbench for understanding repository evolution and investigating code history with deterministic Git analysis and AI-assisted interpretation.

A developer should be able to:

- Search a repository
- Explore its branches, commits, and contributors
- See how it evolved over time
- Compare branches and trace divergence
- Read AI-generated explanations grounded in actual repository evidence
- Save investigations, notes, and bookmarks
- Return to their workspace later and continue where they left off

---

## 4. Target Users

**Primary:**

- Software developers exploring unfamiliar codebases
- Students working with complex open-source repositories
- Open-source contributors investigating project history
- Developers onboarding to a new team's repository

**Secondary:**

- Engineering leads reviewing repository activity and health
- Code reviewers tracing change context across branches
- Technical project evaluators assessing repository maturity

---

## 5. Goals

- Centralize repository investigation into a single workspace
- Reduce context switching between GitHub pages, terminal, and browser tabs
- Provide structured Git intelligence (DAG graphs, branch divergence, commit statistics, file churn)
- Preserve investigation context across sessions with persistent storage
- Make repository history easier to understand through deterministic analysis
- Provide AI explanations grounded in repository evidence — not hallucinated facts
- Maintain reliable performance under real-world GitHub API constraints
- Keep architecture simple and maintainable

---

## 6. Non-Goals

GitExplore V2 is **not** trying to become:

- A full Git hosting platform (no push, pull, or clone operations)
- A GitHub replacement or mirror
- An IDE or code editor
- An autonomous coding agent that writes or modifies code
- A generic AI chatbot with GitHub branding
- An enterprise DevOps pipeline manager
- A social network for developers
- A CI/CD system

---

## 7. MVP Definition

### Must-Have (V2 MVP)

| Area | Requirement |
| :--- | :--- |
| **Backend** | Node.js + TypeScript REST API server |
| **Database** | PostgreSQL on Neon (Free Plan) with Prisma ORM and migrations |
| **GitHub backend** | Server-side GitHub API integration with token management |
| **Repository intelligence** | Commit DAG engine, statistics, branch divergence, file-change analysis |
| **Persistent workspace** | User sessions, saved repositories, investigation records |
| **Notes & bookmarks** | Per-repository and per-commit notes and bookmarks |
| **AI provider abstraction** | Pluggable AI provider interface (not hardcoded to one vendor) |
| **AI repository overview** | AI-generated summary of a repository's purpose, structure, and activity |
| **AI commit explanation** | AI-generated explanation of what a commit does and why it matters |
| **AI diff review** | AI-generated review of code changes with observations and potential issues |
| **AI branch analysis** | AI-generated comparison of branch divergence with context |
| **AI repository health** | AI-generated assessment of repository activity, maintenance signals, and risks |
| **Structured AI responses** | Schema-validated, typed AI output — not raw text blobs |
| **AI caching** | Cached AI analysis results to avoid redundant provider calls |
| **Authentication** | User authentication for persistent workspace access |
| **Security** | Server-side API key storage, input validation, CORS, rate limiting |
| **Testing** | TypeScript validation, build verification, unit/integration tests for critical paths |
| **Production deployment** | Vercel frontend, backend hosting, database provisioning |

### Nice-to-Have / Later

| Feature | Notes |
| :--- | :--- |
| Repository Q&A | Natural-language questions about a specific repository |
| Advanced AI investigation flows | Multi-step investigation chains |
| Background analysis jobs | Pre-compute intelligence for saved repositories |
| Worker queue system | Only if workload demands async processing |
| Advanced repository health scoring | Quantitative health metrics beyond AI interpretation |
| Contributor analytics | Detailed commit distribution and author-level analysis |
| Release & tag explorer | Release notes, changelogs, asset tracking |

---

## 8. Core Features

### 8.1 Server-Side GitHub Integration

**Purpose:** Move GitHub API calls to the backend so tokens stay server-side, rate limits are managed centrally, and response payloads are normalized before reaching the client.

**User value:** Higher rate limits (5,000 req/hr with a token vs. 60 unauthenticated), faster responses through server-side caching, and no risk of token exposure in browser DevTools.

**Behavior:** The frontend calls GitExplore API endpoints (`/api/github/...`). The backend proxies to GitHub, normalizes responses, caches results, and returns typed payloads.

**Dependencies:** Backend skeleton, environment configuration, GitHub token management.

### 8.2 Repository Intelligence Engine

**Purpose:** Deterministic analysis of Git repository structure — commit DAGs, merge/root detection, branch divergence, ahead/behind counts, file-change frequency, contributor activity.

**User value:** Structured repository intelligence that does not depend on AI and is always deterministically reproducible.

**Behavior:** The backend computes analysis from GitHub data. Results are stored and returned as typed intelligence payloads.

**Dependencies:** GitHub backend integration, database for caching analysis results.

### 8.3 Persistent Workspace

**Purpose:** Save repositories, investigations, notes, bookmarks, and tags across sessions.

**User value:** Developers can close the browser, return days later, and see their saved repositories, investigation history, and notes exactly as they left them.

**Behavior:** Authenticated users have a workspace. They can save repositories, create investigation records (snapshots of what they were looking at and why), attach notes to commits/branches/diffs, bookmark items, and organize with tags.

**Dependencies:** Authentication, database, workspace API.

### 8.4 AI Provider Abstraction

**Purpose:** A pluggable interface for sending structured prompts to any LLM provider and receiving validated responses.

**User value:** The system is not locked to a single AI vendor. Providers can be swapped without changing application logic.

**Behavior:** A provider interface defines `analyze(prompt, schema) → validated response`. Implementations exist for specific providers. Prompts are versioned. Responses are validated against Zod or similar schemas.

**Dependencies:** Backend infrastructure, environment configuration for API keys.

### 8.5 AI Repository Overview

**Purpose:** Generate a structured summary of a repository: what it does, how active it is, what languages and patterns it uses, and what its maintenance posture looks like.

**User value:** A developer exploring an unfamiliar repository gets a concise, evidence-backed overview instead of reading dozens of files manually.

**Behavior:** The context builder assembles repository metadata, top-level structure, recent commit activity, language breakdown, and contributor summary into a structured prompt. The AI returns a typed response with sections: purpose, tech stack, activity assessment, and notable patterns.

**Dependencies:** Repository intelligence engine, AI provider, GitHub backend.

### 8.6 AI Commit Explanation

**Purpose:** Explain what a specific commit does, why the changes were made, and what the implications are.

**User value:** Instead of reading raw diffs and guessing intent, the developer gets an explanation grounded in the actual patch content.

**Behavior:** The context builder assembles the commit message, author info, parent relationships, changed files, and patch content. The AI returns a structured explanation with summary, motivation analysis, change breakdown, and risk flags.

**Dependencies:** Commit detail API, diff data, AI provider.

### 8.7 AI Diff Review

**Purpose:** Review code changes across files with observations about quality, patterns, and potential issues.

**User value:** A lightweight automated review that highlights what changed and flags items worth attention.

**Behavior:** The context builder assembles file diffs, additions/deletions, and file metadata. The AI returns observations per file with severity levels and categories.

**Dependencies:** Diff data, AI provider.

### 8.8 AI Branch Analysis

**Purpose:** Explain the divergence between two branches — what changed, why, and what the implications are for merging.

**User value:** Before merging or reviewing a branch, the developer gets a structured assessment of divergence.

**Behavior:** The context builder assembles ahead/behind counts, commit delta, changed files, and comparison metadata. The AI returns a typed analysis with divergence summary, notable changes, merge risk assessment, and recommendations.

**Dependencies:** Branch comparison API, AI provider.

### 8.9 AI Repository Health Analysis

**Purpose:** Assess the maintenance health of a repository based on activity signals.

**User value:** Quick assessment of whether a repository is actively maintained, stale, or abandoned.

**Behavior:** The context builder assembles commit frequency, last activity dates, issue/PR activity, contributor count, and release cadence. The AI returns a health assessment with scores and explanations.

**Dependencies:** Repository intelligence, AI provider.

---

## 9. User Flows

### 9.1 New User Flow

```
Landing page (Home.tsx)
  → Search GitHub username
  → Profile page with repositories
  → Select repository
  → View repository analysis and intelligence
  → View AI overview
  → Explore branches, commits, diffs
  → View AI explanations
```

### 9.2 Investigation Flow

```
Repository page
  → Select branch
  → Browse commit history
  → Click commit
  → View commit details + diff
  → Request AI commit explanation
  → Request AI diff review
  → Save investigation with notes
```

### 9.3 Branch Comparison Flow

```
Repository page
  → Open branch comparison
  → Select base and head branches
  → View ahead/behind, commit delta, file changes
  → Request AI branch analysis
  → Save comparison as investigation
```

### 9.4 Workspace Flow

```
Login / authenticate
  → View saved repositories
  → Open repository
  → See previous investigations
  → Review saved notes and bookmarks
  → Continue investigation
  → Add new notes
```

---

## 10. AI Product Philosophy

AI in GitExplore is an **interpretation layer** over deterministic repository evidence.

Rules:

1. **AI is not the source of truth.** Repository data (commits, diffs, branches, file trees) is the source of truth. AI interprets this data.
2. **AI must receive structured evidence.** Every AI call includes a context payload built from actual repository data. AI does not browse GitHub independently.
3. **AI must not fabricate repository facts.** If the evidence does not support a claim, the AI must not make it.
4. **AI responses must be structured and validated.** Raw text blobs are not acceptable. Every AI response conforms to a typed schema that the frontend can reliably render.
5. **AI failures must be graceful.** If the AI provider is down, slow, or returns invalid output, the application continues working. Deterministic analysis is always available without AI.
6. **AI results must be cached.** Identical analysis requests should not trigger redundant provider calls.

---

## 11. MVP Success Criteria

The V2 MVP is considered complete when:

- [ ] A Node.js backend serves GitHub data to the frontend through `/api/github/*` endpoints
- [ ] PostgreSQL (Neon Free Plan, via Prisma) stores user workspaces, saved repositories, investigations, notes, and bookmarks
- [ ] GitHub API calls happen server-side with a configured token
- [ ] The repository intelligence engine computes DAG, statistics, divergence, and file-change analysis
- [ ] AI provider abstraction supports at least one provider
- [ ] AI repository overview, commit explanation, diff review, branch analysis, and health analysis are functional
- [ ] AI responses are schema-validated and cached
- [ ] Users can authenticate and access persistent workspaces
- [ ] The existing V1 frontend functionality continues to work
- [ ] TypeScript strict compilation passes with zero errors
- [ ] Production build completes successfully
- [ ] Critical paths have test coverage
