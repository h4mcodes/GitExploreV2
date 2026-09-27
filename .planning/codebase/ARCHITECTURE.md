# Architecture & Data Flow

## 1. Architectural Principles
GitExplore is a **pure client-side Git Repository Intelligence & Management Platform** with zero backend infrastructure. It is designed around fast, accessible, deterministic client-side data modeling and visual inspection.

### Key Tenets
1. **Single Source of Truth**: All GitHub API fetching and network caching is centralized exclusively in `src/services/githubApi.ts`.
2. **Deterministic Modeling**: Git structures (branches, commit histories, parent-child relationships, diff chunks) are modeled as deterministic data structures in memory.
3. **No Heavy Framework Bloat**: No Redux, no Tailwind, no heavy graphing libraries (e.g. D3/Cytoscape) that inflate bundle sizes. All DAGs, heatmaps, and diff tables are rendered with lean React components and CSS grid/flexbox.
4. **Resilience & Fault Isolation**: React Error Boundaries wrap the entire app (`App.tsx`) and critical inspection panels (`CommitInspection.tsx`, `BranchCompare.tsx`, `ContributionGraph.tsx`) so failures remain localized without crashing the session.

---

## 2. High-Level System Diagram

```
+-----------------------------------------------------------------------------------+
|                                   App.tsx                                         |
|  +-----------------------------------------------------------------------------+  |
|  |               ErrorBoundary  &  NetworkStatusBanner                         |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                                React Router DOM                                   |
|                               /                \                                  |
|                              /                  \                                 |
|                      Home.tsx                    Profile.tsx                      |
|                  (Landing / Search)        (Workbench & Intelligence)             |
|                                            /         |         \                  |
|                                           /          |          \                 |
|                                 ProfileCard   StatsCard   RepoCard                |
|                                                              |                    |
|                                             +----------------+----------------+   |
|                                             |                |                |   |
|                                     BranchExplorer     CommitHistory    DiffViewer|
|                                             |                |                |   |
|                                     BranchCompare     CommitInspection            |
+---------------------------------------------+----------------+--------------------+
                                              |
                                     src/services/
                       +----------------------+----------------------+
                       | githubApi.ts (Cache, | security.ts (URL &   |
                       | Fetch, Rate Limits)  | Input Sanitization)  |
                       +----------------------+----------------------+
                                              |
                                     Public GitHub API
```

---

## 3. Core Component Hierarchy & Subsystems

### A. Routing Subsystem (`App.tsx`)
- `/` -> `Home.tsx` (Hero landing, quick username search, interactive visual preview).
- `/profile/:username` -> `Profile.tsx` (Central repository intelligence workbench).

### B. Repository Explorer & Filter Subsystem (`Profile.tsx`)
- Fetches user metadata and up to 100 repositories.
- Client-side filtering across name, description, and language.
- Client-side sorting: `updated`, `stars`, `forks`, `created`, `name`.
- Pagination: Client-side incremental batches (12 per page) with "Load More".
- Active repository selection opens deep Git history and investigation panels.

### C. Git History & DAG Lineage Subsystem (`CommitHistory.tsx`, `BranchExplorer.tsx`)
- `BranchExplorer`: Lists branches, pins default branch, flags protected branches.
- `CommitHistory`: Fetches commit stream, extracts commit messages, authors, dates, and parent SHAs.
- `buildCommitRelationshipModel`: Calculates graph nodes, edges, merge commit flags (`parents.length > 1`), root commits (`parents.length === 0`), and child commit lineages.
- Interactive drawers allow stepping through parent and child relationships.

### D. Change Investigation & Diff Subsystem (`DiffViewer.tsx`, `BranchCompare.tsx`, `CommitInspection.tsx`)
- `DiffViewer`: Parses raw Git patches into structured hunk headers, additions (`+`), deletions (`-`), and unchanged context lines. Supports **Unified (Inline)** and **Split (Side-by-Side)** views.
- `BranchCompare`: Compares base and head branches, displaying ahead/behind counts, commit log differences, and aggregate changed file trees.
- `CommitInspection`: Detailed modal displaying author info, verification status, commit parents, file list, and interactive diff viewer.

### E. Contribution Intelligence Subsystem (`ContributionGraph.tsx`)
- 12-Month Calendar Heatmap: 52 weeks x 7 days grid with exact month headers and contribution intensity levels (0 to 4).
- 72-Hour Live Event Stream: Categorized into Pushes, Pull Requests, Issues, Creates, and Stars/Forks with expandable commit details.

---

## 4. State Management Patterns
1. **Local View State**: Controlled by React hooks (`useState`, `useReducer` where complex).
2. **Memoization**: Intensive calculations (DAG node mapping, diff parsing, repository filtering/sorting, calendar cell aggregation) are wrapped in `useMemo`.
3. **URL Route Parameters**: Active username is driven by `useParams<{ username: string }>()`.
